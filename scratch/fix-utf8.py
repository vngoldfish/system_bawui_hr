import sys

file_path = "c:/Users/TUSAN/Desktop/CONG TY LONG/bawuiweb/src/components/dashboard/DashboardClient.tsx"

try:
    with open(file_path, "rb") as f:
        data = f.read()
    
    print(f"File size: {len(data)} bytes")
    
    # Try decoding with replace to find bad bytes
    decoded = data.decode("utf-8", errors="replace")
    
    # Find positions of \ufffd
    pos = 0
    while True:
        pos = decoded.find("\ufffd", pos)
        if pos == -1:
            break
        
        # Print surrounding context
        start = max(0, pos - 100)
        end = min(len(decoded), pos + 100)
        context = decoded[start:end]
        print(f"Invalid UTF-8 at index {pos}. Context:")
        print("---")
        print(context)
        print("---")
        pos += 1
        
except Exception as e:
    print(f"Error: {e}")
