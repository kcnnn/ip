# Roof Inspection Wizard

A mobile-first web application for comprehensive roof inspections with AI-powered analysis using ChatGPT API.

## Features

- **7-Step Inspection Process**: Complete roof inspection workflow
- **AI-Powered Analysis**: ChatGPT integration for photo analysis
- **Mobile-First Design**: Optimized for field use on mobile devices
- **Professional Reports**: AI-generated detailed inspection reports
- **Hail Damage Assessment**: Specialized 10'x10' test square methodology

## Inspection Steps

1. **Elevation Photos** - 4 elevation photos (front, right, rear, left)
2. **Roof Edge Inspection** - Gutter measurement + underlayment photos
3. **Ridge Inspection** - Ridge closeup + under-ridge photos
4. **Roof Overview** - 8 clockwise overview photos
5. **Roof Accessories** - Flexible documentation of all roof accessories
6. **Hail Test Square** - 10'x10' test square with hail damage assessment
7. **Insured Interview** - Damage discussion + satellite verification + Zelle payment

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd roof-inspection-wizard
```

### 2. Start the Server
```bash
python3 -m http.server 8000
```

### 3. Open in Browser
Navigate to `http://localhost:8000`

### 4. Configure API Key
- Click "START" on the home page
- You'll be redirected to the API setup page
- Enter your ChatGPT API key
- The key is stored locally in your browser

## API Key Setup

**Important**: You need a ChatGPT API key to use AI features:

1. Visit [OpenAI API](https://platform.openai.com/api-keys)
2. Create a new API key
3. Enter the key in the setup page when prompted
4. The key is stored locally and never sent to our servers

## Usage

### Mobile Use (Recommended)
1. Find your computer's IP address
2. Access from mobile: `http://[YOUR_IP]:8000`
3. Use camera features for photo capture

### Desktop Use
1. Access `http://localhost:8000`
2. Use file upload for photos

## File Structure

```
├── index.html                 # Home page
├── api-setup.html            # API key setup
├── elevation-photos.html     # Step 1: Elevation photos
├── roof-edge.html           # Step 2: Roof edge inspection
├── ridge-inspection.html    # Step 3: Ridge inspection
├── roof-overview.html       # Step 4: Roof overview
├── roof-accessories.html    # Step 5: Roof accessories
├── hail-test-square.html    # Step 6: Hail test square
├── insured-interview.html   # Step 7: Insured interview
├── styles.css               # Main styles
├── api-config.js            # API configuration
└── *.js files               # Step-specific JavaScript
```

## Security

- API keys are stored locally in browser localStorage
- No sensitive data is sent to external servers
- All processing happens client-side
- API keys are never logged or transmitted

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers

## License

This project is for internal use. Please ensure you have proper licensing for any commercial use.

## Support

For technical support or questions, please contact the development team.
