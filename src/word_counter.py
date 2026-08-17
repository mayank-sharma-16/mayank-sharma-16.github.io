import os

# Configuration: Add folders or files you want to skip
IGNORE_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'env', '.vscode', 'dist', 'build'}
IGNORE_FILES = {'word_counter.py', '.DS_Store', 'package-lock.json', 'yarn.lock'}
# Common text/code extensions to scan (Leave empty to scan ALL files)
VALID_EXTENSIONS = {'.txt', '.md', '.py', '.js', '.ts', '.html', '.css', '.json', '.csv', '.c', '.cpp', '.java'}

def count_words_and_files(start_dir="."):
    total_files = 0
    total_words = 0
    
    print(f"{'File Path':<60} | {'Word Count':>10}")
    print("-" * 75)
    
    for root, dirs, files in os.walk(start_dir):
        # Modifying dirs in-place tells os.walk to skip these directories recursively
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for file in files:
            if file in IGNORE_FILES:
                continue
                
            file_path = os.path.join(root, file)
            _, ext = os.path.splitext(file)
            
            # Filter by extension if VALID_EXTENSIONS is populated
            if VALID_EXTENSIONS and ext.lower() not in VALID_EXTENSIONS:
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    words = len(content.split())
                    
                relative_path = os.path.relpath(file_path, start_dir)
                # Truncate long paths for clean console printing
                display_path = (relative_path[:57] + '...') if len(relative_path) > 60 else relative_path
                print(f"{display_path:<60} | {words:>10,}")
                
                total_files += 1
                total_words += len(content.split())
            except Exception:
                # Safely skip unreadable system or binary files
                continue

    print("=" * 75)
    print(f"TOTAL FILES SCANNED : {total_files:,}")
    print(f"TOTAL WORD COUNT    : {total_words:,}")

if __name__ == "__main__":
    count_words_and_files()
