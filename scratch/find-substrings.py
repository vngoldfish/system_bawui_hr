file_path = "c:/Users/TUSAN/Desktop/CONG TY LONG/bawuiweb/src/components/dashboard/DashboardClient.tsx"

with open(file_path, "rb") as f:
    data = f.read()

decoded = data.decode("utf-8", errors="replace")

# Print first 20 occurrences of "お知らせ"
idx = 0
while True:
    idx = decoded.find("お知らせ", idx)
    if idx == -1:
        break
    print(f"Found 'お知らせ' at index {idx}, context: {decoded[idx-20:idx+30]}")
    idx += 4
