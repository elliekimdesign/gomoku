# Sound Files for 3D Gomoku

Place your custom audio files in this directory for game sounds.

## Required Sound Files

The game expects these audio files:
- **Stone placement**: `stone.mp3` - Plays when placing stones
- **Victory**: `win.mp3` - Plays when a player wins the game

## Alternative Configuration

If you prefer different sounds for each player, edit the `playStoneSound` function in `src/App.tsx`:
```javascript
// Uncomment this line and add black-stone.mp3 + white-stone.mp3
const audio = player === 1 ? preloadAudio('/sounds/black-stone.mp3') : preloadAudio('/sounds/white-stone.mp3');
```

## Current Setup

- **Stone sound**: Same sound for both players using `stone.mp3`
- **Win sound**: Plays 200ms after the winning stone placement using `win.mp3`
- **Volume**: Set to 60% (0.6) for all sounds
- **Preloaded**: All sounds are loaded on page startup for instant playback

## Supported File Types

The HTML Audio element supports:
- MP3 (.mp3) - Recommended
- WAV (.wav) 
- OGG (.ogg)
- M4A (.m4a)

## Volume Adjustment

To change volume, edit the `preloadAudio` function in `src/App.tsx`:
```javascript
audio.volume = 0.6; // Change this value (0.0 to 1.0)
```

## Adding Your Files

1. Copy your audio files to this `public/sounds/` directory
2. Name them `stone.mp3` and `win.mp3` (or update the code with your filenames)
3. Refresh the page to load the new sounds