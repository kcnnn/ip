# ZKPassport Integration Setup

This project uses the ZKPassport SDK to verify users' country of residence.

## Installation

1. Install dependencies:
```bash
npm install
```

This will install:
- `@zkpassport/sdk` - The ZKPassport SDK for identity verification
- `vite` - Build tool for bundling the application

## Running the Development Server

Start the development server:
```bash
npm run dev
```

This will:
- Start a local development server (usually on http://localhost:3000)
- Automatically open the browser
- Enable hot module replacement for live updates

## Building for Production

To create a production build:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## How It Works

1. When a user clicks "Verify with ZKPassport", the app:
   - Initializes the ZKPassport SDK
   - Creates a verification request for nationality (country)
   - Redirects the user to ZKPassport for verification

2. After verification:
   - The user is redirected back to your site
   - The country code is extracted from the verification result
   - The country is added to the map visualization
   - Statistics are updated

## Notes

- The ZKPassport SDK requires ES modules, which is why we use Vite for bundling
- The verification process redirects users to ZKPassport's verification page
- Only the country code is stored (no other personal information)
- Data is stored in browser localStorage for this demo

