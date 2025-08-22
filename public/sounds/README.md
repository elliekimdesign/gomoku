# Sound Files for 3D Gomoku

Place your custom audio files in this directory for stone placement sounds.

## Current Configuration

The game is set up to use different sounds for each player:
- **Black stones**: `black-stone.mp3` 
- **White stones**: `white-stone.mp3`

## Alternative Configuration

If you prefer to use the same sound for both players, edit the `playStoneSound` function in `src/App.tsx` and uncomment this line:
```javascript
const soundFile = '/sounds/stone-place.mp3';
```

## Supported File Types

The HTML Audio element supports:
- MP3 (.mp3)
- WAV (.wav) 
- OGG (.ogg)
- M4A (.m4a)

## Volume

Current volume is set to 50% (0.5). You can adjust this in the `playStoneSound` function by changing the `audio.volume` value (0.0 to 1.0).

## Adding Your Files

1. Copy your audio files to this `public/sounds/` directory
2. Make sure the filenames match what's configured in the code
3. The game will automatically use your custom sounds when you place stones