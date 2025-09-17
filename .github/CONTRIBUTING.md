# Contributing to PRISM

Thank you for your interest in contributing to PRISM! We welcome contributions from the community and are excited to work with you to make mining operations safer through AI technology.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Community](#community)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@prism-ai.com](mailto:conduct@prism-ai.com).

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm/yarn
- **Python** 3.9+
- **Docker** and Docker Compose
- **Git**
- **Code Editor** (VS Code recommended)

### First Contribution

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/prism.git
   cd prism
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/prism.git
   ```
4. **Create a branch** for your contribution:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 💻 Development Setup

### Local Development Environment

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development services**:
   ```bash
   npm run dev
   ```

4. **Verify setup**:
   ```bash
   curl http://localhost:8080/health
   ```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📝 Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

- 🐛 **Bug fixes**
- ✨ **New features**
- 📚 **Documentation improvements**
- 🧪 **Test additions**
- ⚡ **Performance optimizations**
- 🔒 **Security enhancements**
- 🎨 **UI/UX improvements**

### Before You Start

1. **Check existing issues** to avoid duplicating work
2. **Create an issue** for significant changes to discuss the approach
3. **Join our Discord** to connect with the community
4. **Review the roadmap** to align with project direction

### Contribution Workflow

1. **Create an issue** (for significant changes)
2. **Fork and clone** the repository
3. **Create a feature branch**
4. **Make your changes**
5. **Write/update tests**
6. **Update documentation**
7. **Submit a pull request**

## 🔄 Pull Request Process

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] All tests pass locally
- [ ] Documentation is updated
- [ ] Commit messages follow conventional commits
- [ ] PR description is complete

### PR Requirements

1. **Clear description** of changes and motivation
2. **Link to related issues**
3. **Test coverage** for new functionality
4. **Documentation updates** where applicable
5. **Screenshots/recordings** for UI changes

### Review Process

1. **Automated checks** must pass (CI/CD, tests, linting)
2. **Code review** by at least one maintainer
3. **Testing** in staging environment
4. **Approval** from code owners
5. **Merge** by maintainers

### PR Guidelines

- Keep PRs focused and atomic
- Use descriptive titles and descriptions
- Include tests for new functionality
- Update documentation as needed
- Respond to review feedback promptly

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the FAQ** and documentation
3. **Try the latest version** to see if the issue persists
4. **Gather relevant information** (logs, environment, steps to reproduce)

### Issue Types

Use the appropriate issue template:

- 🐛 **Bug Report**: For reporting bugs
- 💡 **Feature Request**: For suggesting new features
- 📚 **Documentation**: For documentation issues
- ⚡ **Performance**: For performance problems
- 🔒 **Security**: For security vulnerabilities (use private disclosure)

### Issue Quality

Good issues include:

- Clear, descriptive title
- Detailed description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment information
- Relevant logs or screenshots

## 📏 Code Standards

### Style Guidelines

#### TypeScript/JavaScript
- Use **TypeScript** for all new code
- Follow **ESLint** and **Prettier** configurations
- Use **meaningful variable names**
- Add **JSDoc comments** for public APIs
- Prefer **functional programming** patterns

#### Python
- Follow **PEP 8** style guide
- Use **type hints** for function signatures
- Add **docstrings** for all functions and classes
- Use **Black** for code formatting
- Follow **Google style** for docstrings

#### General
- Use **conventional commits** for commit messages
- Keep **functions small** and focused
- Write **self-documenting code**
- Add **comments** for complex logic
- Use **consistent naming** conventions

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/modifications
- `chore`: Build/CI changes

**Examples:**
```
feat(api): add risk assessment endpoint
fix(web): resolve mobile navigation issue
docs(readme): update installation instructions
```

## 🧪 Testing

### Test Requirements

- **Unit tests** for all new functions/methods
- **Integration tests** for API endpoints
- **E2E tests** for critical user flows
- **Maintain coverage** above 80%

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Guidelines

- Write tests **before** implementing features (TDD)
- Use **descriptive test names**
- Test **edge cases** and error conditions
- Mock **external dependencies**
- Keep tests **fast** and **reliable**

## 📚 Documentation

### Documentation Types

- **README**: Project overview and quick start
- **API Docs**: Endpoint documentation
- **User Guide**: End-user documentation
- **Developer Guide**: Technical documentation
- **Code Comments**: Inline documentation

### Documentation Standards

- Use **clear, concise language**
- Include **code examples**
- Add **screenshots** for UI features
- Keep documentation **up-to-date**
- Follow **markdown standards**

### Updating Documentation

When making changes:

1. Update relevant **README** sections
2. Update **API documentation** for endpoint changes
3. Add **code comments** for complex logic
4. Update **user guides** for feature changes
5. Create **migration guides** for breaking changes

## 🏗️ Architecture Guidelines

### Service Design

- Follow **microservices** architecture
- Use **RESTful APIs** for service communication
- Implement **proper error handling**
- Add **comprehensive logging**
- Design for **scalability**

### Database Guidelines

- Use **migrations** for schema changes
- Add **proper indexes** for performance
- Follow **normalization** principles
- Implement **data validation**
- Consider **data privacy** requirements

### Security Guidelines

- **Never commit** secrets or credentials
- Use **environment variables** for configuration
- Implement **proper authentication**
- Follow **OWASP** security guidelines
- Conduct **security reviews** for sensitive changes

## 🌍 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat and community support
- **Email**: security@prism-ai.com for security issues

### Getting Help

- Check the **documentation** first
- Search **existing issues** and discussions
- Ask in **Discord** for quick questions
- Create a **GitHub issue** for bugs or feature requests

### Community Guidelines

- Be **respectful** and inclusive
- Help **newcomers** get started
- Share **knowledge** and experience
- Provide **constructive feedback**
- Follow the **code of conduct**

## 🎯 Roadmap and Priorities

### Current Focus Areas

1. **AI/ML Model Improvements**
2. **Mobile App Enhancement**
3. **Real-time Performance**
4. **Edge Computing Integration**
5. **Security Hardening**

### How to Contribute to Priorities

- Check **project boards** for current priorities
- Look for **"good first issue"** labels
- Join **planning discussions**
- Propose **improvements** aligned with roadmap

## 🏷️ Labels and Project Management

### Issue Labels

- **Priority**: `critical`, `high`, `medium`, `low`
- **Type**: `bug`, `feature`, `documentation`, `performance`
- **Status**: `needs-triage`, `in-progress`, `blocked`
- **Difficulty**: `good-first-issue`, `help-wanted`, `expert-needed`
- **Services**: `web-dashboard`, `mobile-app`, `ai-pipeline`, etc.

### Project Boards

We use GitHub Projects to track:

- **Sprint Planning**: Current sprint work
- **Roadmap**: Long-term planning
- **Bug Triage**: Bug prioritization
- **Feature Requests**: Feature evaluation

## 📞 Contact

### Maintainers

- **Debdeep Banerjee** - Lead AI Engineer & Founder
  - GitHub: [@debdeep-banerjee](https://github.com/debdeep-banerjee)
  - Email: debdeep@prism-ai.com

### Support Channels

- **General Questions**: [GitHub Discussions](https://github.com/your-username/prism/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/your-username/prism/issues)
- **Security Issues**: security@prism-ai.com
- **Community Chat**: [Discord](https://discord.gg/prism)

## 🙏 Recognition

We appreciate all contributions and recognize contributors in:

- **README** contributor section
- **Release notes** for significant contributions
- **Hall of Fame** for outstanding contributors
- **Swag** for active community members

---

Thank you for contributing to PRISM! Together, we're making mining operations safer through AI technology. 🚀