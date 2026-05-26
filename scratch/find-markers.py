file_path = "c:/Users/TUSAN/Desktop/CONG TY LONG/bawuiweb/src/components/dashboard/DashboardClient.tsx"

with open(file_path, "rb") as f:
    data = f.read()

decoded = data.decode("utf-8", errors="replace")

start_marker = "{/* Company Announcements Column */}"
end_marker = "  return ("

start_idx = decoded.find(start_marker)
print(f"Start marker found at index {start_idx}")

# Find end_marker after start_idx
end_idx = decoded.find(end_marker, start_idx)
print(f"End marker found at index {end_idx}")

if start_idx != -1 and end_idx != -1:
    print("Content between markers:")
    print("---")
    print(decoded[start_idx:end_idx])
    print("---")
else:
    print("Markers not found!")
