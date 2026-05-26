file_path = "c:/Users/TUSAN/Desktop/CONG TY LONG/bawuiweb/src/components/dashboard/DashboardClient.tsx"

with open(file_path, "rb") as f:
    data = f.read()

decoded = data.decode("utf-8", errors="replace")

# Let's find the corrupted start
corrupt_start = decoded.find('<span className="text-3xl mb-2">🍱</span>\n                    <')
if corrupt_start == -1:
    # Try with carriage return
    corrupt_start = decoded.find('<span className="text-3xl mb-2">🍱</span>\r\n                    <')

print(f"Corrupt start index: {corrupt_start}")

# Find the end of the corrupted block: the closing </div> of announcements column (the second one)
# Wait, let's search for "お知らせ" or notice.desc or similar to find the end
# The end of the old block is:
# "                ))}\n              </div>\n            </Card>\n          </div>"
end_marker = "                ))}\r\n              </div>\r\n            </Card>\r\n          </div>"
corrupt_end = decoded.find(end_marker, corrupt_start)
if corrupt_end == -1:
    end_marker = "                ))}\n              </div>\n            </Card>\n          </div>"
    corrupt_end = decoded.find(end_marker, corrupt_start)

print(f"Corrupt end index: {corrupt_end}")

if corrupt_start != -1 and corrupt_end != -1:
    corrupt_end += len(end_marker)
    print("Corrupt content to replace:")
    print("---")
    print(decoded[corrupt_start:corrupt_end])
    print("---")
    
    # Let's construct the clean replacement
    replacement = """<span className="text-3xl mb-2">🍱</span>
                    <span>休憩終了</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Company Announcements Column */}
          <div className="lg:col-span-5">
            <Card title="📢 会社からのお知らせ" className="h-full bg-white border border-slate-200 shadow-sm rounded-3xl p-6">
              <div className="space-y-4">
                {announcementsLoading ? (
                  <div className="text-center py-8 text-slate-400 font-semibold text-xs animate-pulse">
                    読み込み中...
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 font-semibold text-xs border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    お知らせはありません
                  </div>
                ) : (
                  announcements.map((a, idx) => {
                    let tag = 'お知らせ';
                    let tagColor = 'bg-blue-50 text-blue-755 border-blue-200/60';
                    if (a.type === 'urgent') {
                      tag = '緊急';
                      tagColor = 'bg-rose-50 text-rose-700 border-rose-200/60';
                    } else if (a.type === 'warning') {
                      tag = '注意';
                      tagColor = 'bg-amber-50 text-amber-700 border-amber-200/60';
                    }
                    
                    const dateStr = new Date(a.createdAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit'
                    });

                    return (
                      <div key={a.id || idx} className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl hover:border-slate-300 transition-all hover:bg-slate-50 shadow-xs">
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-bold">{dateStr}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${tagColor}`}>{tag}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 leading-normal">{a.title}</h4>
                        <p className="text-[11px] text-slate-550 mt-1.5 leading-relaxed font-semibold whitespace-pre-line">{a.content}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>"""
          
    new_decoded = decoded[:corrupt_start] + replacement + decoded[corrupt_end:]
    
    # Save the file back as valid UTF-8
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_decoded)
        
    print("SUCCESS: File repaired successfully!")
else:
    print("ERROR: Markers not found, could not repair file.")
