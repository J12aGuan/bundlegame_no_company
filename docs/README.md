# 📚 Bundle Game Documentation

Welcome to the Bundle Game documentation! This is your central hub for all project documentation.

---

## 🚨 First Time Here?

### 1. ⚡ Quick Start (5 minutes)
**Goal**: Get the game running locally

→ [**Setup Quickstart Guide**](setup/QUICKSTART.md)

### 2. 🔐 Deploy Security Rules (5 minutes - CRITICAL)
**Goal**: Secure your Firebase database before collecting data

→ [**Security Overview**](../SECURITY.md)

### 3. 📖 Understand the Code (10 minutes)
**Goal**: Navigate the codebase confidently

→ [**Current Architecture**](current/ARCHITECTURE.md)

---

## 📑 Documentation Index

### 🚀 Getting Started

| Document | Purpose | Time |
|----------|---------|------|
| [setup/QUICKSTART.md](setup/QUICKSTART.md) | Get running locally | 5 min |
| [setup/ENVIRONMENT.md](setup/ENVIRONMENT.md) | Detailed environment setup | 10 min |
| [../README.md#-contributing](../README.md#-contributing) | How to contribute | 5 min |

### 🏗️ Architecture & Code

| Document | Purpose | Audience |
|----------|---------|----------|
| [current/ARCHITECTURE.md](current/ARCHITECTURE.md) | Current runtime architecture | Everyone |
| [current/CONFIG_AND_DATASETS.md](current/CONFIG_AND_DATASETS.md) | Firestore config and dataset model | Developers |
| [archive/README.md](archive/README.md) | Archived legacy docs index | Developers |

### ⚙️ Configuration

| Document | Purpose | Audience |
|----------|---------|----------|
| [current/CONFIG_AND_DATASETS.md](current/CONFIG_AND_DATASETS.md) | Current config + dataset operations | Everyone |
| [archive/legacy-2026-03/](archive/legacy-2026-03/) | Legacy static-config documentation | Researchers |

### 🔐 Security

| Document | Purpose | Urgency |
|----------|---------|---------|
| [../SECURITY.md](../SECURITY.md) | Security overview | Overview |

### 🧪 Experiment Design

| Document | Purpose | Audience |
|----------|---------|----------|
| [experiment/EXPERIMENT_DESIGN.md](experiment/EXPERIMENT_DESIGN.md) | Experiment methodology | Researchers |
| [experiment/experiment_reference.csv](experiment/experiment_reference.csv) | Round-by-round reference | Researchers |

---

## 🗺️ Documentation Navigation

### By Role

**I'm a new developer** → Start with [setup/QUICKSTART.md](setup/QUICKSTART.md), then [current/ARCHITECTURE.md](current/ARCHITECTURE.md)

**I'm a researcher customizing experiments** → Read [current/CONFIG_AND_DATASETS.md](current/CONFIG_AND_DATASETS.md) and [experiment/EXPERIMENT_DESIGN.md](experiment/EXPERIMENT_DESIGN.md)

**I'm deploying to production** → Follow [../SECURITY.md](../SECURITY.md) first, then deploy

**I'm fixing a bug** → Check [current/ARCHITECTURE.md](current/ARCHITECTURE.md) to find the right file

### By Task

| I want to... | Read this... |
|--------------|-------------|
| Run the project locally | [setup/QUICKSTART.md](setup/QUICKSTART.md) |
| Understand the codebase | [current/ARCHITECTURE.md](current/ARCHITECTURE.md) |
| Change game timers/parameters | [current/CONFIG_AND_DATASETS.md](current/CONFIG_AND_DATASETS.md) |
| Modify experiment rounds | [current/CONFIG_AND_DATASETS.md](current/CONFIG_AND_DATASETS.md) |
| Secure the database | [../SECURITY.md](../SECURITY.md) |
| Add a new feature | [../README.md#-contributing](../README.md#-contributing) |
| Export participant data | [../README.md](../README.md#-data-export) |
| Understand legacy config docs | [archive/README.md](archive/README.md) |

---

## 🔗 Quick Links

- [Main README](../README.md) - Project front page
- [Firebase Project](https://console.firebase.google.com/project/bundling-63c10)
- [Vercel Dashboard](https://vercel.com)
- [GitHub Repo](https://github.com/nnicholas-c/bundlegame_no_company)

---

## 🆘 Need Help?

1. **Search this documentation** - Use GitHub's search or `grep -r "keyword" docs/`
2. **Check the issue tracker** - Someone may have had the same problem
3. **Contact the maintainer** - Nicholas Chen: [nchen06@berkeley.edu](mailto:nchen06@berkeley.edu)

---

## 📝 Documentation Standards

- **Keep docs up-to-date** - Update docs when changing code
- **Use relative links** - All links should work locally and on GitHub
- **Add examples** - Show, don't just tell
- **Keep it concise** - Break long docs into sections

---

*Last updated: March 2026*
