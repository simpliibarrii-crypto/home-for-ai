# Examples

> Complete runnable examples for Home for AI are maintained in the project documentation.

See the following resources:

- [API Documentation](../docs/API.md) — REST API usage examples
- [Architecture Overview](../docs/ARCHITECTURE.md) — system design and data flow
- [Quickstart](../README.md#quickstart) — getting started guide
- [`backend/tests/`](../backend/tests/) — test suite with real usage patterns

## Usage

```python
# Example: run the backend API locally
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

```bash
# Example: start the Tauri desktop app
npm install
npm run tauri:dev
```
