file_path = "c:/Users/TUSAN/Desktop/CONG TY LONG/bawuiweb/src/components/dashboard/DashboardClient.tsx"

with open(file_path, "rb") as f:
    data = f.read()

decoded = data.decode("utf-8", errors="replace")

print(decoded[22000:26000])
