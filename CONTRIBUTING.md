# Contributing to Smart Home Voice Control

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/smart-home-voice-control.git
   cd smart-home-voice-control
   ```
3. **Run the setup script**:
   ```bash
   ./scripts/setup.sh
   ```

## 📋 Development Guidelines

### Code Style
- **JavaScript**: Use ES6+ features, camelCase for variables
- **HTML**: Semantic elements, proper accessibility attributes
- **CSS**: BEM methodology, mobile-first responsive design
- **Python**: PEP 8 style guide, type hints where applicable

### Commit Messages
Use conventional commits format:
```
type(scope): description

feat(voice): add new command pattern for security
fix(ui): resolve device card alignment issue
docs(readme): update installation instructions
```

### Testing
- Test voice commands with both Web Speech API and Whisper
- Verify responsive design on multiple screen sizes
- Check browser compatibility (Chrome, Firefox, Safari, Edge)
- Use the built-in debugging tools:
  ```javascript
  smartHomeApp.testAllCommands()
  smartHomeApp.checkDeviceUIMapping()
  ```

## 🔧 Project Structure

```
├── frontend/           # Main web interface
├── backend/           # Whisper server (optional)
├── tests/             # Testing utilities
├── docs/              # Documentation
└── scripts/           # Setup and utility scripts
```

## 🐛 Bug Reports

When filing bug reports, please include:
- Browser and version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Voice command that failed (if applicable)

## ✨ Feature Requests

For new features, please:
- Check existing issues to avoid duplicates
- Describe the use case and expected behavior
- Consider backward compatibility
- Provide mockups or examples if applicable

## 🔀 Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**:
   - Follow the code style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Test thoroughly**:
   - Test voice commands in both backends
   - Verify responsive design
   - Check console for errors

4. **Commit with clear messages**:
   ```bash
   git commit -m "feat(commands): add temperature control for all rooms"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **PR Requirements**:
   - Clear title and description
   - Link to related issues
   - Screenshots/videos for UI changes
   - Test results summary

## 📝 Documentation

When updating documentation:
- Keep README.md up to date
- Document new voice commands
- Update code comments for complex functions
- Include examples where helpful

## 🏷️ Areas for Contribution

### High Priority
- **New Device Types**: Support for additional smart home devices
- **Voice Command Patterns**: More natural language variations
- **Mobile Optimization**: Enhanced touch experience
- **Accessibility**: Screen reader support, keyboard navigation

### Medium Priority
- **Internationalization**: Multi-language support
- **Themes**: Additional color schemes
- **Performance**: Optimization for older devices
- **Testing**: Automated test suite

### Low Priority
- **Advanced Features**: Voice training, custom wake words
- **Integration**: Home Assistant, OpenHAB compatibility
- **Analytics**: Usage statistics and insights

## 🔒 Security

- Never commit API keys or sensitive data
- Report security issues privately via email
- Follow secure coding practices
- Validate all user inputs

## 📞 Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Documentation**: Check `/docs` folder first

## 🙏 Recognition

Contributors will be:
- Listed in the README.md contributors section
- Credited in release notes
- Given maintainer access for significant contributions

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make Smart Home Voice Control better! 🏠✨