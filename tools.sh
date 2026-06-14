#!/bin/bash
FILES=$(find src -type f -name "*.tsx" -o -name "*.ts" -o -name "*.css")
for file in $FILES; do
  sed -i 's/bg-plug-black/bg-white/g' "$file"
  sed -i 's/bg-plug-charcoal/bg-pink-50/g' "$file"
  sed -i 's/border-plug-gray/border-pink-200/g' "$file"
  # Replace global text color if possible, maybe we don't need text-black replacement if we just swap colors in CSS?
done
