#!/bin/bash
# Find all TSX files
FILES=$(find src -type f -name "*.tsx")

for file in $FILES; do
  # Specific blocks (fix LandingPage black button first)
  sed -i 's/bg-white text-black/bg-gray-900 text-white/g' "$file"
  
  # Backgrounds
  sed -i 's/bg-plug-black/bg-white/g' "$file"
  sed -i 's/bg-plug-charcoal/bg-pink-50/g' "$file"
  sed -i 's/bg-black/bg-white/g' "$file"
  sed -i 's/bg-gradient-to-br from-plug-charcoal to-plug-black/bg-gradient-to-br from-pink-50 to-white/g' "$file"
  sed -i 's/bg-gradient-to-r from-plug-charcoal to-plug-black/bg-gradient-to-r from-pink-50 to-white/g' "$file"

  # Borders
  sed -i 's/border-plug-gray/border-pink-200/g' "$file"
  
  # Text Colors
  sed -i 's/text-white/text-gray-900/g' "$file"
  sed -i 's/text-gray-400/text-gray-600/g' "$file"
  sed -i 's/text-gray-300/text-gray-700/g' "$file"
  
  # Accents (Yellow to Pink)
  sed -i 's/bg-plug-yellow/bg-pink-500/g' "$file"
  sed -i 's/text-plug-yellow/text-pink-600/g' "$file"
  sed -i 's/border-plug-yellow/border-pink-500/g' "$file"
  
  sed -i 's/bg-plug-amber/bg-pink-600/g' "$file"
  sed -i 's/text-plug-amber/text-pink-700/g' "$file"
  
  # Hover states
  sed -i 's/hover:bg-plug-gray/hover:bg-pink-200/g' "$file"
  sed -i 's/hover:text-white/hover:text-gray-900/g' "$file"
  sed -i 's/hover:bg-plug-charcoal/hover:bg-pink-100/g' "$file"
  sed -i 's/hover:bg-plug-black/hover:bg-pink-50/g' "$file"
  
  # Button text fix (pink button was yellow, so it had text-black)
  sed -i 's/bg-pink-500 text-black/bg-pink-500 text-white/g' "$file"
  sed -i 's/bg-pink-500 text-[10px] text-black/bg-pink-500 text-[10px] text-white/g' "$file"
  
  # More specific button text fix
  sed -i 's/text-black\([^>]*bg-pink-500\)/text-white\1/g' "$file"
  sed -i 's/bg-pink-500\([^>]*\)text-black/bg-pink-500\1text-white/g' "$file"
done

# In index.css, change the body background
sed -i 's/background-color: var(--color-plug-black);/background-color: #FFFFFF;/g' src/index.css
sed -i 's/color: white;/color: #111827;/g' src/index.css

