from pathlib import Path

MAX_LEN = 60    
CUT_LEN = 40    

# Get the absolute path to the current directory
base_dir = Path('.').resolve()

# rglob("*") forces a recursive search through every single folder, including 'public'
for old_path in base_dir.rglob("*"):
    # Skip directories and the hidden .git folder
    if old_path.is_dir() or '.git' in old_path.parts:
        continue
        
    file_name = old_path.name
    if len(file_name) > MAX_LEN:
        ext = old_path.suffix
        name = old_path.stem
        
        new_name = name[:CUT_LEN] + ext
        new_path = old_path.with_name(new_name)
        
        # Avoid overwriting existing files
        counter = 1
        while new_path.exists():
            new_name = f"{name[:CUT_LEN-4]}_{counter}{ext}"
            new_path = old_path.with_name(new_name)
            counter += 1
            
        print(f"Renaming: {file_name} -> {new_name}")
        try:
            old_path.rename(new_path)
        except Exception as e:
            print(f"Failed to rename {file_name}: {e}")
