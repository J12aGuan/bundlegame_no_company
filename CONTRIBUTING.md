# Contributing to Bundle Game

Thanks for your interest in contributing! This document provides guidelines for contributing to the project.

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- Git
- Firebase credentials (contact Nicholas)

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/nnicholas-c/bundlegame_no_company.git
cd bundlegame_no_company

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in Firebase credentials (contact Nicholas)

# 4. Run locally
npm run dev
# Visit http://localhost:5173
```

**Detailed setup**: See [docs/setup/QUICKSTART.md](docs/setup/QUICKSTART.md)

---

## 📋 Development Workflow

### 1. Create a Branch

```bash
# For features
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/bug-description

# For documentation
git checkout -b docs/what-you-changed
```

### 2. Make Your Changes

- Write clear, commented code
- Follow existing code style
- Update documentation if needed
- Test your changes locally

### 3. Test Your Changes

```bash
# Run the dev server
npm run dev

# Build for production (test)
npm run build

# Preview production build
npm run preview
```

### 4. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a clear message
git commit -m "feat: add new feature X"
# or
git commit -m "fix: resolve issue with Y"
# or
git commit -m "docs: update setup guide"
```

**Commit message prefixes**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
# Push to your branch
git push origin your-branch-name

# Then create a pull request on GitHub
```

---

## 📝 Code Style Guidelines

### General Principles
- **Clarity over cleverness** - Write code that's easy to understand
- **Consistency** - Follow existing patterns in the codebase
- **Comments** - Add comments for complex logic, not obvious code
- **DRY** - Don't repeat yourself, but don't over-abstract

### SvelteKit/JavaScript Style
- Use `const` and `let`, avoid `var`
- Prefer arrow functions for callbacks
- Use template literals for string interpolation
- Keep functions small and focused
- Use meaningful variable names

### File Organization
- **`src/lib/`** - Shared utilities, game logic, Firebase operations
- **`src/routes/`** - Page components (SvelteKit pages)
- **`src/lib/configs/`** - Configuration JSON files
- **`docs/`** - All documentation

See [docs/architecture/CODEMAP.md](docs/architecture/CODEMAP.md) for detailed structure.

---

## 🧪 Testing

### Manual Testing Checklist
Before submitting a PR, verify:

- [ ] App runs locally without errors (`npm run dev`)
- [ ] Production build works (`npm run build && npm run preview`)
- [ ] Firebase operations work (login, data logging)
- [ ] UI looks correct on desktop and mobile
- [ ] No console errors or warnings
- [ ] Changes don't break existing features

### Testing Firebase Changes
If your changes involve Firebase:
1. Test with test data first
2. Verify security rules are not violated
3. Check that data is structured correctly in Firestore
4. Ensure authentication still works

---

## ⚙️ Configuration Changes

If you're modifying game configuration:

1. **Edit `src/lib/centralConfig.json`** for runtime settings
2. **Document your changes** in [docs/configuration/CENTRALIZED_CONFIG.md](docs/configuration/CENTRALIZED_CONFIG.md)
3. **Test thoroughly** - config changes affect gameplay
4. **Note default values** in your PR description

See [docs/configuration/OVERVIEW.md](docs/configuration/OVERVIEW.md) for the config system.

---

## 📚 Documentation

### When to Update Documentation
- Adding new features → Update relevant docs in `docs/`
- Changing configuration → Update config docs
- Modifying file structure → Update architecture docs
- Adding dependencies → Update setup guide

### Documentation Style
- Use clear, concise language
- Include code examples
- Add links between related docs
- Keep the table of contents updated

---

## 🔐 Security

### Security Best Practices
- **Never commit `.env` files** - They're in `.gitignore` for a reason
- **Don't expose API keys** in code or documentation
- **Review Firebase rules** before deploying security changes
- **Test authentication flows** after auth-related changes

See [SECURITY.md](SECURITY.md) and [docs/security/](docs/security/) for security guidelines.

---

## 🚀 Deployment

### Auto-Deployment
- Pushing to `main` auto-deploys to Vercel
- Test your changes thoroughly before merging to `main`
- Check the Vercel deployment logs for errors

### Environment Variables
If you add new environment variables:
1. Add to `.env.example` with documentation
2. Update [docs/setup/ENVIRONMENT.md](docs/setup/ENVIRONMENT.md)
3. Note in PR that Vercel env vars need updating
4. Coordinate with maintainer for production secrets

---

## 📊 Firebase Database

### Data Structure
- **Users/{userId}/** - User data, earnings, orders, actions
- **Global/** - Global counters (totalusers, etc.)
- **Auth/{token}/** - Authentication tokens

See [docs/architecture/PROJECT_STRUCTURE.md](docs/architecture/PROJECT_STRUCTURE.md) for database schema.

### Making Database Changes
1. **Backup first** - Export data before schema changes
2. **Test with test data** - Don't modify production data directly
3. **Update security rules** if needed (in `firestore.rules`)
4. **Document changes** in your PR

---

## 🐛 Bug Reports

### Before Reporting
1. Check if the issue already exists
2. Try reproducing in a clean environment
3. Check console for error messages

### When Reporting
Include:
- **Description** - What happened vs. what should happen
- **Steps to reproduce** - How to trigger the bug
- **Environment** - Browser, OS, Node version
- **Error messages** - Console output, screenshots
- **Expected behavior** - What should happen instead

---

## 💬 Pull Request Guidelines

### PR Checklist
- [ ] Code follows project style guidelines
- [ ] Changes are tested locally
- [ ] Documentation is updated (if needed)
- [ ] Commit messages are clear
- [ ] No merge conflicts with `main`
- [ ] PR description explains the changes

### PR Description Template
```markdown
## What does this PR do?
Brief description of changes

## Why are these changes needed?
Context and motivation

## How was this tested?
Steps taken to verify the changes work

## Related Issues
Closes #123 (if applicable)

## Screenshots (if applicable)
```

---

## 🎯 Priorities

We prioritize:
1. **Security fixes** - Critical priority
2. **Bug fixes** - High priority
3. **Documentation improvements** - Medium priority
4. **New features** - Low to medium priority
5. **Performance optimizations** - As needed

---

## 📞 Questions?

- **Setup issues**: See [docs/setup/QUICKSTART.md](docs/setup/QUICKSTART.md)
- **Code questions**: See [docs/architecture/](docs/architecture/)
- **Other questions**: Contact Nicholas Chen: PARKSINCHAISRI@gmail.com

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing! 🎉
