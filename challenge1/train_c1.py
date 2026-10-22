# %% [markdown]
# # RMIT Hackathon 2026 — Challenge 1: Multilingual Prompt-Attack Classification
# **Chosen model:** set `MODEL_NAME` below (default: `FacebookAI/xlm-roberta-large`).
#
# Setup in Kaggle: Accelerator = GPU T4 x2 (or P100). Add Input → this competition's data,
# and Add Input → Models → the approved model you picked (e.g. aisuko/xlm-roberta-large).
# Rename the notebook to `<university>_<campus>_<team>_C1`, e.g. `RMIT_SGS_myteam_C1`.

# %%
import glob, os, random, time
import numpy as np, pandas as pd, torch
from sklearn.metrics import f1_score, classification_report
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader
from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup

# One of the approved model folder names, as it appears under /kaggle/input.
# Fast first run: "xlm-roberta-base" (~10 min). Stronger: "xlm-roberta-large" or "mmbert-base".
MODEL_NAME = "xlm-roberta-large"
MAX_LEN = 256
BATCH = 16
EPOCHS = 3
LR = 1e-5 if "large" in MODEL_NAME else 2e-5
VAL_FRAC = 0.1
SEED = 42

LABELS = ["BENIGN", "JAILBREAK", "PROMPT_INJECTION"]
L2I = {l: i for i, l in enumerate(LABELS)}

random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
device = "cuda" if torch.cuda.is_available() else "cpu"
print("device:", device)

# %% Locate data and model files under /kaggle/input
def find_one(pattern):
    hits = sorted(glob.glob(pattern, recursive=True))
    assert hits, f"not found: {pattern}"
    return hits[0]

train_path = find_one("/kaggle/input/**/train.csv")
test_path = find_one("/kaggle/input/**/test.csv")
cfgs = [p for p in glob.glob("/kaggle/input/**/config.json", recursive=True)
        if MODEL_NAME.lower() in p.lower()]
assert cfgs, f"Model '{MODEL_NAME}' not found — add it via Add Input → Models. Found: " \
    + str(glob.glob("/kaggle/input/**/config.json", recursive=True))
model_dir = os.path.dirname(sorted(cfgs, key=len)[0])
print(train_path, test_path, model_dir, sep="\n")

train = pd.read_csv(train_path)
test = pd.read_csv(test_path)
train["text"] = train["text"].fillna("").astype(str)
test["text"] = test["text"].fillna("").astype(str)
train["y"] = train["label"].map(L2I)
print(train.shape, test.shape)
print(train["label"].value_counts(normalize=True))
print(pd.crosstab(train["language"], train["label"]))

# %% Split (stratified on language+label) and tokenize
strat = train["language"].astype(str) + "_" + train["label"]
tr_df, va_df = train_test_split(train, test_size=VAL_FRAC, stratify=strat, random_state=SEED)

tok = AutoTokenizer.from_pretrained(model_dir)

def encode(df):
    enc = tok(df["text"].tolist(), truncation=True, max_length=MAX_LEN)
    ys = df["y"].tolist() if "y" in df else [0] * len(df)
    return [{"input_ids": a, "attention_mask": m, "labels": y}
            for a, m, y in zip(enc["input_ids"], enc["attention_mask"], ys)]

def collate(batch):
    n = max(len(b["input_ids"]) for b in batch)
    pad = tok.pad_token_id
    ids = torch.tensor([b["input_ids"] + [pad] * (n - len(b["input_ids"])) for b in batch])
    att = torch.tensor([b["attention_mask"] + [0] * (n - len(b["attention_mask"])) for b in batch])
    return ids, att, torch.tensor([b["labels"] for b in batch])

tr_ds, va_ds, te_ds = encode(tr_df), encode(va_df), encode(test)
tr_dl = DataLoader(tr_ds, batch_size=BATCH, shuffle=True, collate_fn=collate)
va_dl = DataLoader(va_ds, batch_size=BATCH * 2, collate_fn=collate)
te_dl = DataLoader(te_ds, batch_size=BATCH * 2, collate_fn=collate)

# %% Model, class-weighted loss, optimiser
model = AutoModelForSequenceClassification.from_pretrained(
    model_dir, num_labels=3, id2label=dict(enumerate(LABELS)), label2id=L2I,
    ignore_mismatched_sizes=True).to(device)

counts = np.bincount(tr_df["y"], minlength=3)
weights = torch.tensor((counts.sum() / (3 * counts)) ** 0.5, dtype=torch.float, device=device)
print("class weights:", weights)
loss_fn = torch.nn.CrossEntropyLoss(weight=weights)

opt = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
steps = len(tr_dl) * EPOCHS
sched = get_linear_schedule_with_warmup(opt, int(0.1 * steps), steps)
scaler = torch.cuda.amp.GradScaler(enabled=device == "cuda")

@torch.no_grad()
def predict_logits(dl):
    model.eval()
    out = []
    for ids, att, _ in dl:
        with torch.autocast(device_type="cuda", dtype=torch.float16, enabled=device == "cuda"):
            out.append(model(input_ids=ids.to(device), attention_mask=att.to(device)).logits.float().cpu())
    return torch.cat(out).numpy()

# %% Train, keeping the epoch with the best validation macro-F1
best_f1, best_state = -1, None
for ep in range(EPOCHS):
    model.train(); t0 = time.time(); total = 0
    for i, (ids, att, y) in enumerate(tr_dl):
        with torch.autocast(device_type="cuda", dtype=torch.float16, enabled=device == "cuda"):
            logits = model(input_ids=ids.to(device), attention_mask=att.to(device)).logits
        loss = loss_fn(logits.float(), y.to(device))
        opt.zero_grad()
        scaler.scale(loss).backward()
        scaler.unscale_(opt)
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        scaler.step(opt); scaler.update(); sched.step()
        total += loss.item()
        if i % 200 == 0:
            print(f"ep{ep} step {i}/{len(tr_dl)} loss {total / (i + 1):.4f}")
    va_logits = predict_logits(va_dl)
    f1 = f1_score(va_df["y"], va_logits.argmax(1), average="macro")
    print(f"epoch {ep}: val macro-F1 {f1:.4f} ({time.time() - t0:.0f}s)")
    if f1 > best_f1:
        best_f1 = f1
        best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}

model.load_state_dict(best_state)
va_logits = predict_logits(va_dl)
print("best val macro-F1:", best_f1)
print(classification_report(va_df["y"], va_logits.argmax(1), target_names=LABELS, digits=4))

# %% Tune per-class logit offsets on validation to maximise macro-F1
grid = np.arange(-2, 2.01, 0.25)
best_bias, best_bias_f1 = np.zeros(3), f1_score(va_df["y"], va_logits.argmax(1), average="macro")
for b1 in grid:
    for b2 in grid:
        b = np.array([0, b1, b2])
        f = f1_score(va_df["y"], (va_logits + b).argmax(1), average="macro")
        if f > best_bias_f1 + 1e-4:
            best_bias, best_bias_f1 = b, f
print("bias", best_bias, "val macro-F1 after bias", best_bias_f1)

va_pred = (va_logits + best_bias).argmax(1)
for lang, g in va_df.assign(p=va_pred).groupby("language"):
    print(lang, len(g), round(f1_score(g["y"], g["p"], average="macro"), 4))

# %% Predict test and write submission.csv
te_logits = predict_logits(te_dl)
np.save("test_logits.npy", te_logits)  # keep for ensembling runs later
sub = pd.DataFrame({"id": test["id"], "label": [LABELS[i] for i in (te_logits + best_bias).argmax(1)]})
sub.to_csv("submission.csv", index=False)
assert len(sub) == len(test) and sub["label"].isin(LABELS).all()
print(sub.shape)
print(sub["label"].value_counts(normalize=True))
sub.head()
