from PIL import Image
import sys
from collections import Counter

def get_dominant_colors(image_path, num_colors=5):
    try:
        img = Image.open(image_path)
        img = img.convert('RGB')
        
        # Resize for faster processing
        img = img.resize((150, 150))
        
        pixels = list(img.getdata())
        counts = Counter(pixels)
        
        # Get top colors
        top_colors = counts.most_common(num_colors)
        
        print("Dominant colors:")
        for color, count in top_colors:
            hex_color = "#{:02x}{:02x}{:02x}".format(color[0], color[1], color[2])
            print(f"{hex_color} - rgb{color} - frequency: {count}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        get_dominant_colors(sys.argv[1])
    else:
        print("Provide image path")
