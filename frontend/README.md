# Pixel Perfect Screenshot

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pixel-perfect-view-1435.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a6e0e922-6845-40df-be48-5d59dc0d9fc2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

The Express API lives separately in `../backend`. Configure `../backend/.env` and start the API before trying account, contact, or scam-check features.

```sh
cd frontend
npm install
npm run dev
```

The frontend expects the API at `http://localhost:5001/api` by default. Set `VITE_API_BASE_URL` in `.env` to change it. The development server runs at `http://localhost:5174`.

Build the frontend with:

```sh
npm run build
```
