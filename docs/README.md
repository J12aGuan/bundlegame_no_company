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

→ [**Architecture Overview**](architecture/OVERVIEW.md)

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
| [architecture/OVERVIEW.md](architecture/OVERVIEW.md) | High-level architecture | Everyone |
| [architecture/CODEMAP.md](architecture/CODEMAP.md) | src/ organization guide | Developers |
| [architecture/PROJECT_STRUCTURE.md](architecture/PROJECT_STRUCTURE.md) | Complete file tree | Developers |
| [architecture/FILE_EXPLANATIONS.md](architecture/FILE_EXPLANATIONS.md) | What each file does | Developers |

### ⚙️ Configuration

| Document | Purpose | Audience |
|----------|---------|----------|
| [configuration/OVERVIEW.md](configuration/OVERVIEW.md) | Config system overview | Everyone |
| [configuration/CENTRALIZED_CONFIG.md](configuration/CENTRALIZED_CONFIG.md) | centralConfig.json guide | Developers |
| [configuration/PARAMETERS.md](configuration/PARAMETERS.md) | Detailed parameter reference | Researchers |

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

**I'm a new developer** → Start with [setup/QUICKSTART.md](setup/QUICKSTART.md), then [architecture/CODEMAP.md](architecture/CODEMAP.md)

**I'm a researcher customizing experiments** → Read [configuration/PARAMETERS.md](configuration/PARAMETERS.md) and [experiment/EXPERIMENT_DESIGN.md](experiment/EXPERIMENT_DESIGN.md)

**I'm deploying to production** → Follow [../SECURITY.md](../SECURITY.md) first, then deploy

**I'm fixing a bug** → Check [architecture/FILE_EXPLANATIONS.md](architecture/FILE_EXPLANATIONS.md) to find the right file

### By Task

| I want to... | Read this... |
|--------------|-------------|
| Run the project locally | [setup/QUICKSTART.md](setup/QUICKSTART.md) |
| Understand the codebase | [architecture/OVERVIEW.md](architecture/OVERVIEW.md) |
| Change game timers/parameters | [configuration/CENTRALIZED_CONFIG.md](configuration/CENTRALIZED_CONFIG.md) |
| Modify experiment rounds | [configuration/PARAMETERS.md](configuration/PARAMETERS.md) |
| Secure the database | [../SECURITY.md](../SECURITY.md) |
| Add a new feature | [../README.md#-contributing](../README.md#-contributing) |
| Export participant data | [../README.md](../README.md#-data-export) |
| Understand store layouts | [configuration/PARAMETERS.md](configuration/PARAMETERS.md#store-configuration) |

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

*Last updated: February 2026*
