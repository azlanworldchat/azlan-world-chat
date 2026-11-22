#!/usr/bin/env python3
"""AZLAN WORLD CHAT — icon library generator (original self-drawn art).

Generates the missing icons in the app's luxury fantasy style (metallic gold,
teal gemstone accents, transparent background, 120x120 viewBox like the
existing icons), copies existing flat icons + VIP assets into the organised
category folders assets/icons/{user,room,vip,store,admin,support}/, and writes
the manifest assets/icons/index.json (name, category, file, size).

Sizes (per the owner's confirmed spec):
  standard icons 64x64, small controls 48x48, large feature icons 128x128,
  VIP badges 256x256. SVGs are vector — the size is the display/export size.
"""
import json
import os
import shutil
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS = os.path.join(ROOT, "assets", "icons")
VIP = os.path.join(ROOT, "assets", "vip")

DEFS = """<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset=".5" stop-color="#f5c542"/><stop offset="1" stop-color="#c98f00"/></linearGradient>
<linearGradient id="t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ff2e3"/><stop offset="1" stop-color="#00a99d"/></linearGradient>
<linearGradient id="r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fa3"/><stop offset="1" stop-color="#e63946"/></linearGradient>
</defs>"""

def svg(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' + DEFS + body + '</svg>')

# ---- new drawings (original, gold + gemstone style) ----
NEW = {
    # USER
    "follow": '<circle cx="48" cy="42" r="20" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M16 104 Q16 70 48 70 Q80 70 80 104 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="92" cy="88" r="18" fill="url(#t)" stroke="#005f57" stroke-width="2"/><path d="M92 78 L92 98 M82 88 L102 88" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
    "unfollow": '<circle cx="48" cy="42" r="20" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M16 104 Q16 70 48 70 Q80 70 80 104 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="92" cy="88" r="18" fill="url(#r)" stroke="#7a0e18" stroke-width="2"/><path d="M82 88 L102 88" stroke="#fff" stroke-width="6" stroke-linecap="round"/>',
    "friend": '<circle cx="42" cy="40" r="18" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M12 104 Q12 72 42 72 Q60 72 66 84 L66 104 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="82" cy="44" r="15" fill="url(#t)" stroke="#005f57" stroke-width="2"/><path d="M62 104 Q62 78 82 78 Q104 78 104 104 Z" fill="url(#t)" stroke="#005f57" stroke-width="2"/><circle cx="42" cy="40" r="4" fill="#fff" opacity=".7"/>',
    "message": '<path d="M18 26 Q18 14 32 14 L88 14 Q102 14 102 26 L102 72 Q102 86 88 86 L58 86 L38 106 L38 86 L32 86 Q18 86 18 72 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M32 36 L88 36 M32 50 L74 50 M32 64 L64 64" stroke="#7a5c00" stroke-width="5" stroke-linecap="round"/><circle cx="92" cy="30" r="6" fill="#ff5a8a"/>',
    "block": '<circle cx="52" cy="40" r="18" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M22 100 Q22 70 52 70 Q66 70 74 78 L74 100 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="86" cy="82" r="24" fill="none" stroke="url(#r)" stroke-width="8"/><path d="M70 66 L102 98" stroke="url(#r)" stroke-width="8" stroke-linecap="round"/>',
    "share": '<circle cx="34" cy="60" r="12" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="88" cy="30" r="12" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="88" cy="90" r="12" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M44 54 L78 36 M44 66 L78 84" stroke="url(#g)" stroke-width="6" stroke-linecap="round"/><circle cx="88" cy="30" r="4" fill="#ff5a8a"/><circle cx="88" cy="90" r="4" fill="#4ade80"/>',
    "gallery": '<rect x="14" y="22" width="92" height="76" rx="10" fill="none" stroke="url(#g)" stroke-width="6"/><path d="M14 82 L46 50 L66 70 L82 54 L106 78 L106 88 Q106 98 96 98 L24 98 Q14 98 14 88 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="38" cy="40" r="9" fill="url(#t)" stroke="#005f57" stroke-width="2"/><circle cx="88" cy="34" r="4" fill="#ff5a8a"/>',
    # VOICE ROOM
    "speaker": '<path d="M18 46 L38 46 L62 22 L62 98 L38 74 L18 74 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2" stroke-linejoin="round"/><path d="M74 42 Q84 60 74 78 M84 32 Q100 60 84 88" fill="none" stroke="url(#g)" stroke-width="6" stroke-linecap="round"/><circle cx="62" cy="60" r="4" fill="#fff" opacity=".8"/>',
    "seat": '<ellipse cx="60" cy="52" rx="44" ry="34" fill="url(#g)" stroke="#7a5c00" stroke-width="2" opacity=".95"/><ellipse cx="60" cy="52" rx="30" ry="22" fill="#fff" opacity=".35"/><rect x="46" y="38" width="28" height="34" rx="13" fill="#3b1a6e" stroke="#ffd24a" stroke-width="3"/><circle cx="60" cy="50" r="6" fill="#ffd24a"/><rect x="30" y="88" width="60" height="10" rx="5" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="60" cy="20" r="5" fill="url(#t)"/>',
    "unlock": '<rect x="28" y="52" width="64" height="48" rx="10" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M40 52 L40 36 Q40 20 60 20 Q80 20 80 36" fill="none" stroke="url(#g)" stroke-width="7" stroke-linecap="round"/><circle cx="60" cy="70" r="8" fill="#3b1a6e"/><rect x="56" y="70" width="8" height="16" rx="4" fill="#3b1a6e"/><circle cx="86" cy="34" r="4" fill="#ff5a8a"/>',
    "leave": '<path d="M24 16 L70 16 L70 104 L24 104 Z" fill="none" stroke="url(#g)" stroke-width="6" stroke-linejoin="round"/><path d="M44 60 L96 60 M82 44 L98 60 L82 76" fill="none" stroke="url(#g)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="60" r="5" fill="url(#t)"/>',
    # VIP
    "vip-status": '<path d="M60 12 L96 26 L96 58 Q96 88 60 108 Q24 88 24 58 L24 26 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2" stroke-linejoin="round"/><path d="M60 32 L67 50 L86 51 L71 63 L76 82 L60 71 L44 82 L49 63 L34 51 L53 50 Z" fill="#fff" stroke="#c98f00" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="14" r="5" fill="#ff5a8a"/><circle cx="30" cy="30" r="4" fill="url(#t)"/><circle cx="90" cy="30" r="4" fill="#4ade80"/>',
    # STORE
    "purchase": '<rect x="20" y="30" width="80" height="56" rx="10" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><rect x="20" y="30" width="80" height="18" rx="9" fill="#3b1a6e" opacity=".85"/><circle cx="34" cy="39" r="4" fill="#ffd24a"/><path d="M38 66 L52 80 L84 48" fill="none" stroke="#3b1a6e" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="92" cy="76" r="5" fill="#ff5a8a"/>',
    # ADMIN
    "audit-logs": '<rect x="26" y="14" width="56" height="92" rx="8" fill="#fff" stroke="url(#g)" stroke-width="4"/><path d="M36 32 L72 32 M36 48 L72 48 M36 64 L60 64 M36 80 L66 80" stroke="#a67c00" stroke-width="5" stroke-linecap="round"/><circle cx="86" cy="84" r="20" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><circle cx="86" cy="84" r="10" fill="none" stroke="#3b1a6e" stroke-width="4"/><path d="M100 98 L112 110" stroke="#3b1a6e" stroke-width="6" stroke-linecap="round"/>',
    # SUPPORT
    "help": '<circle cx="60" cy="60" r="46" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><text x="60" y="80" text-anchor="middle" font-family="Georgia, serif" font-size="56" font-weight="900" fill="#3b1a6e">?</text><circle cx="88" cy="30" r="6" fill="#ff5a8a"/>',
    "complaint": '<path d="M20 24 Q20 12 34 12 L86 12 Q100 12 100 24 L100 68 Q100 80 86 80 L60 80 L42 98 L42 80 L34 80 Q20 80 20 68 Z" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M60 34 L60 58" stroke="#3b1a6e" stroke-width="8" stroke-linecap="round"/><circle cx="60" cy="70" r="5" fill="#3b1a6e"/><circle cx="90" cy="26" r="5" fill="url(#t)"/>',
    "payment-support": '<circle cx="60" cy="46" r="8" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><path d="M22 60 Q22 22 60 22 Q98 22 98 60" fill="none" stroke="url(#g)" stroke-width="7" stroke-linecap="round"/><rect x="22" y="52" width="22" height="32" rx="8" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><rect x="76" y="52" width="22" height="32" rx="8" fill="url(#g)" stroke="#7a5c00" stroke-width="2"/><rect x="30" y="88" width="60" height="18" rx="6" fill="url(#t)" stroke="#005f57" stroke-width="2"/><circle cx="44" cy="97" r="3" fill="#fff"/>',
}

# (category, file, display name, source) — source = ('new', key) | ('flat', name) | ('vip', kind, n)
CATALOG = []
def cat(category, entries):
    for file, name, src, size in entries:
        CATALOG.append({"category": category, "file": file, "name": name, "src": src, "size": size})

cat("user", [
    ("profile.svg", "Profile", ("flat", "profile"), "64x64"),
    ("edit-profile.svg", "Edit Profile", ("flat", "edit"), "64x64"),
    ("follow.svg", "Follow", ("new", "follow"), "64x64"),
    ("unfollow.svg", "Unfollow", ("new", "unfollow"), "64x64"),
    ("friend.svg", "Friend", ("new", "friend"), "64x64"),
    ("message.svg", "Message", ("new", "message"), "64x64"),
    ("block.svg", "Block", ("new", "block"), "64x64"),
    ("report.svg", "Report", ("flat", "report"), "64x64"),
    ("share.svg", "Share", ("new", "share"), "64x64"),
    ("gallery.svg", "Gallery", ("new", "gallery"), "64x64"),
])
cat("room", [
    ("microphone.svg", "Microphone", ("flat", "mic"), "48x48"),
    ("mute.svg", "Mute", ("flat", "mic-off"), "48x48"),
    ("speaker.svg", "Speaker", ("new", "speaker"), "48x48"),
    ("volume.svg", "Volume", ("flat", "volume"), "48x48"),
    ("raise-hand.svg", "Raise Hand", ("flat", "hand"), "48x48"),
    ("mic-seat.svg", "Mic Seat", ("new", "seat"), "64x64"),
    ("seat-lock.svg", "Seat Lock", ("flat", "lock"), "48x48"),
    ("seat-unlock.svg", "Seat Unlock", ("new", "unlock"), "48x48"),
    ("invite.svg", "Invite", ("flat", "invite"), "64x64"),
    ("room-chat.svg", "Room Chat", ("flat", "chat"), "64x64"),
    ("gift.svg", "Gift", ("flat", "gift"), "64x64"),
    ("leave-room.svg", "Leave Room", ("new", "leave"), "48x48"),
])
for n in range(1, 13):
    nn = "%02d" % n
    cat("vip", [
        ("badge-%s.svg" % nn, "VIP %d Badge" % n, ("vipfile", "vip%s" % nn, "badge.svg"), "256x256"),
        ("crown-%s.svg" % nn, "VIP %d Crown" % n, ("vipfile", "vip%s" % nn, "crown.svg"), "128x128"),
        ("frame-%s.svg" % nn, "VIP %d Profile Frame" % n, ("vipfile", "vip%s" % nn, "profile-frame.svg"), "128x128"),
        ("nameplate-%s.svg" % nn, "VIP %d Nameplate" % n, ("vipfile", "vip%s" % nn, "nameplate.svg"), "128x128"),
        ("entry-%s.svg" % nn, "VIP %d Entry Animation" % n, ("vipfile", "vip%s" % nn, "entry.svg"), "128x128"),
    ])
cat("vip", [("status.svg", "VIP Status", ("new", "vip-status"), "128x128")])
cat("store", [
    ("coins.svg", "Coins", ("flat", "coin"), "64x64"),
    ("diamonds.svg", "Diamonds", ("flat", "diamond"), "64x64"),
    ("gifts.svg", "Gifts", ("flat", "gift"), "64x64"),
    ("frames.svg", "Frames", ("flat", "frame"), "128x128"),
    ("themes.svg", "Themes", ("flat", "theme"), "128x128"),
    ("chat-bubbles.svg", "Chat Bubbles", ("flat", "chatbox"), "64x64"),
    ("entry-effects.svg", "Entry Effects", ("flat", "entrance"), "128x128"),
    ("unique-ids.svg", "Unique IDs", ("flat", "id"), "64x64"),
    ("inventory.svg", "Inventory", ("flat", "box"), "64x64"),
    ("purchase.svg", "Purchase", ("new", "purchase"), "64x64"),
    ("wallet.svg", "Wallet", ("flat", "wallet"), "64x64"),
])
cat("admin", [
    ("user-management.svg", "User Management", ("flat", "users"), "128x128"),
    ("vip-management.svg", "VIP Management", ("flat", "crown"), "128x128"),
    ("gift-management.svg", "Gift Management", ("flat", "gift"), "128x128"),
    ("store-management.svg", "Store Management", ("flat", "shop"), "128x128"),
    ("wallet-management.svg", "Wallet Management", ("flat", "wallet"), "128x128"),
    ("broadcasting.svg", "Broadcasting", ("flat", "announce"), "128x128"),
    ("room-management.svg", "Room Management", ("flat", "rooms"), "128x128"),
    ("reports.svg", "Reports", ("flat", "report"), "128x128"),
    ("analytics.svg", "Analytics", ("flat", "chart"), "128x128"),
    ("settings.svg", "Settings", ("flat", "settings"), "128x128"),
    ("audit-logs.svg", "Audit Logs", ("new", "audit-logs"), "128x128"),
])
cat("support", [
    ("help.svg", "Help", ("new", "help"), "128x128"),
    ("customer-service.svg", "Customer Service", ("flat", "support"), "128x128"),
    ("support-ticket.svg", "Support Ticket", ("flat", "ticket"), "128x128"),
    ("complaint.svg", "Complaint", ("new", "complaint"), "128x128"),
    ("payment-support.svg", "Payment Support", ("new", "payment-support"), "128x128"),
])

def main():
    manifest = []
    for item in CATALOG:
        catdir = os.path.join(ICONS, item["category"])
        os.makedirs(catdir, exist_ok=True)
        dest = os.path.join(catdir, item["file"])
        src = item["src"]
        if src[0] == "new":
            with open(dest, "w") as f:
                f.write(svg(NEW[src[1]]))
        elif src[0] == "flat":
            shutil.copy(os.path.join(ICONS, src[1] + ".svg"), dest)
        elif src[0] == "vipfile":
            shutil.copy(os.path.join(VIP, src[1], src[2]), dest)
        # XML-validate
        ET.parse(dest)
        manifest.append({"id": item["category"] + "/" + item["file"].replace(".svg", ""),
                         "name": item["name"], "category": item["category"],
                         "file": "assets/icons/%s/%s" % (item["category"], item["file"]),
                         "size": item["size"]})
    with open(os.path.join(ICONS, "index.json"), "w") as f:
        json.dump({"generatedBy": "tools/gen-icons.py", "count": len(manifest), "icons": manifest}, f, indent=1)
    print("icons generated: %d (categories: user=%d room=%d vip=%d store=%d admin=%d support=%d)" % (
        len(manifest),
        sum(1 for i in manifest if i["category"] == "user"),
        sum(1 for i in manifest if i["category"] == "room"),
        sum(1 for i in manifest if i["category"] == "vip"),
        sum(1 for i in manifest if i["category"] == "store"),
        sum(1 for i in manifest if i["category"] == "admin"),
        sum(1 for i in manifest if i["category"] == "support")))

if __name__ == "__main__":
    main()
