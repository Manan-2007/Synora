#!/usr/bin/env python3
"""Generate the 5-minute Synora presentation script as a .docx."""
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

INK   = RGBColor(0x22,0x25,0x2B)
SAGE  = RGBColor(0x45,0x5A,0x50)
TAUPE = RGBColor(0x8A,0x73,0x66)
GREY  = RGBColor(0x60,0x67,0x72)
LINE  = RGBColor(0xD9,0xDD,0xE0)

doc = Document()
# base font
st = doc.styles["Normal"]
st.font.name = "Calibri"; st.font.size = Pt(11.5); st.font.color.rgb = INK
st.paragraph_format.space_after = Pt(6); st.paragraph_format.line_spacing = 1.12

def shade(cell, hexv):
    tc = cell._tc.get_or_add_tcPr()
    sh = OxmlElement("w:shd"); sh.set(qn("w:val"),"clear"); sh.set(qn("w:fill"),hexv)
    tc.append(sh)

def H(text, size=17, color=INK, before=14, after=4, sub=None):
    p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(before); p.paragraph_format.space_after = Pt(after)
    r = p.add_run(text); r.bold = True; r.font.size = Pt(size); r.font.color.rgb = color
    if sub:
        p.add_run("    ")
        s = p.add_run(sub); s.italic = True; s.font.size = Pt(11); s.font.color.rgb = TAUPE
    return p

def kicker(text, color=TAUPE):
    p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
    r = p.add_run(text.upper()); r.bold = True; r.font.size = Pt(9.5); r.font.color.rgb = color
    rPr = r._r.get_or_add_rPr(); sp = OxmlElement("w:spacing"); sp.set(qn("w:val"),"36"); rPr.append(sp)

def cue(slide, speaker_color=SAGE):
    p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(8); p.paragraph_format.space_after = Pt(2)
    r = p.add_run("▸ "+slide); r.bold = True; r.font.size = Pt(10.5); r.font.color.rgb = speaker_color
    return p

def say(text):
    p = doc.add_paragraph(); p.paragraph_format.left_indent = Inches(0.22); p.paragraph_format.space_after = Pt(4)
    p.add_run(text)
    return p

def action(text):
    p = doc.add_paragraph(); p.paragraph_format.left_indent = Inches(0.22); p.paragraph_format.space_after = Pt(6)
    r = p.add_run("[ "+text+" ]"); r.italic = True; r.font.size = Pt(10); r.font.color.rgb = GREY
    return p

def rule():
    p = doc.add_paragraph(); p.paragraph_format.space_before = Pt(6); p.paragraph_format.space_after = Pt(6)
    pPr = p._p.get_or_add_pPr(); pb = OxmlElement("w:pBdr"); bo = OxmlElement("w:bottom")
    bo.set(qn("w:val"),"single"); bo.set(qn("w:sz"),"6"); bo.set(qn("w:space"),"1"); bo.set(qn("w:color"),"D9DDE0")
    pb.append(bo); pPr.append(pb)

# ---------------- Title ----------------
t = doc.add_paragraph(); t.paragraph_format.space_after = Pt(2)
r = t.add_run("Synora — 5-Minute Presentation Script"); r.bold=True; r.font.size=Pt(22); r.font.color.rgb=INK
sub = doc.add_paragraph(); sub.paragraph_format.space_after = Pt(2)
r = sub.add_run("Manan Kochhar   ·   Arshpreet Kaur   ·   Atharv Bains"); r.font.size=Pt(12); r.font.color.rgb=SAGE; r.bold=True
sub2 = doc.add_paragraph(); sub2.paragraph_format.space_after = Pt(8)
r = sub2.add_run("Target: 4:45–5:00   ·   Order: Manan → Atharv → Arshpreet → Manan → close"); r.italic=True; r.font.size=Pt(10.5); r.font.color.rgb=GREY

# ---------------- Timing table ----------------
kicker("Timing at a glance")
rows = [
    ("Presenter","Section","Slides","Target"),
    ("Manan","Opening + the product","1–7","0:55"),
    ("Atharv","HTML — structure","8–16","0:55"),
    ("Arshpreet","CSS — the visual system","17–24","1:00"),
    ("Manan","JavaScript + product engineering","25–33","1:35"),
    ("Manan","Closing","34–35","0:25"),
    ("—","Transitions / handoffs","—","0:15"),
    ("","TOTAL","","~4:55"),
]
tbl = doc.add_table(rows=len(rows), cols=4); tbl.alignment = WD_TABLE_ALIGNMENT.LEFT
tbl.autofit = True
widths = [Inches(1.4), Inches(3.4), Inches(0.9), Inches(0.9)]
for ri,row in enumerate(rows):
    for ci,val in enumerate(row):
        c = tbl.cell(ri,ci); c.width = widths[ci]
        c.text = ""
        p = c.paragraphs[0]; p.paragraph_format.space_after=Pt(2); p.paragraph_format.space_before=Pt(2)
        run = p.add_run(val); run.font.size=Pt(10.5)
        if ri==0:
            run.bold=True; run.font.color.rgb=RGBColor(0xFF,0xFF,0xFF); shade(c,"22252B")
        elif ri==len(rows)-1:
            run.bold=True; run.font.color.rgb=INK; shade(c,"EBEDEF")
        else:
            if ci==0: run.bold=True; run.font.color.rgb=SAGE
            if ci==3: run.font.color.rgb=TAUPE; run.bold=True
            shade(c,"FFFFFF" if ri%2 else "F6F7F8")

doc.add_paragraph().paragraph_format.space_after=Pt(2)
kicker("Delivery notes", color=SAGE)
say("Speak at a calm, natural pace (~140 words/min). The slides carry the detail — don't read them. Keep each handoff to one sentence and keep the deck moving.")

# ================= SCRIPT =================
def section(title, sub, kick):
    rule(); kicker(kick, color=SAGE); H(title, size=16, sub=sub)

# --- MANAN OPENING ---
section("1 · MANAN — Opening & the product", "Slides 1–7 · ~55 sec", "Manan speaks")
cue("Slide 1 — Title")
say("Good morning, everyone. We're Manan, Atharv and Arshpreet — and this is Synora: one calm home for everything you're studying.")
cue("Slide 2 — The problem")
say("The problem is simple: a student's semester is scattered across half a dozen apps — a to-do list, the class chat, sheets for attendance and grades — and none of them talk to each other.")
cue("Slides 3–4 — The solution / What is Synora")
say("So we built Synora — one personalized workspace that brings tasks, calendar, notes, timetable, attendance and grades together.")
cue("Slide 5 — Technology stack")
say("It's built purely with HTML5, CSS3 and JavaScript — no frameworks, no build step — with browser storage for data and Git for version control.")
cue("Slides 6–7 — Architecture & data flow")
say("Structurally it's clean HTML, CSS and JS files — fourteen pages, eighteen scripts — all tied to one subject list as the single source of truth.")
action("hand over to Atharv")
say("That's the big picture — Atharv will take you through how we structured it in HTML.")

# --- ATHARV HTML ---
section("2 · ATHARV — HTML (structure)", "Slides 8–16 · ~55 sec", "Atharv speaks")
cue("Slide 8 — The structure behind Synora")
say("Every Synora page is built with semantic HTML5 — header, nav, main, sections and a sidebar — so the structure is clear to the browser, to assistive tech, and to our own code.")
cue("Slides 9–12 — Journey, landing, account, personalization")
say("That structure carries the whole journey — from the landing page, into sign-up, a short personalization step for your avatar, subjects and attendance target, and finally the dashboard. These are all real HTML forms with proper labels and input types.")
cue("Slides 13–15 — Feature walkthroughs")
say("The features — tasks, calendar and notes, plus academic tools like timetable, attendance and CGPA — are all structured with lists, cards and form controls.")
cue("Slide 16 — Forms & accessibility")
say("We've also handled accessibility basics — labelled inputs, ARIA and the right input types — so it's usable, not just visible.")
action("hand over to Arshpreet")
say("Once the structure was in place, Arshpreet turned it into Synora's visual system with CSS.")

# --- ARSHPREET CSS ---
section("3 · ARSHPREET — CSS (the visual system)", "Slides 17–24 · ~60 sec", "Arshpreet speaks")
cue("Slides 17–18 — Design system & tokens.css")
say("On top of that, we built one shared design system — one tokens.css file where every colour, space, font and radius is a CSS custom property, reused on every page. It's charcoal, sage and warm-neutral tones, with Manrope throughout.")
cue("Slides 19–21 — Box model, Flexbox, Grid")
say("For layout, every component is really a box — content, padding, border and margin. We use Flexbox for one-dimensional things like the navbar and toolbars, and Grid for two-dimensional layouts like the calendar and dashboard.")
cue("Slide 22 — Responsive design")
say("It's fully responsive — the same page adapts from desktop to tablet to mobile using media queries, and the navigation collapses into a menu on smaller screens.")
cue("Slides 23–24 — Dark mode & loading")
say("It also supports a full dark mode, and a branded loading screen — pure CSS animation with a little JavaScript timing — gives the app a smooth entrance.")
action("hand back to Manan")
say("So HTML gives us the structure, CSS gives us the look — and Manan will show how JavaScript makes it interactive.")

# --- MANAN JS ---
section("4 · MANAN — JavaScript + product engineering", "Slides 25–33 · ~1 min 35 sec", "Manan speaks")
cue("Slides 25–26 — Interactive / fundamentals")
say("This is where it comes alive. JavaScript manages Synora's state — tasks, subjects and users are structured data in variables, arrays and objects, and we loop over them to render the interface.")
cue("Slide 27 — The DOM")
say("The DOM is the bridge between that JavaScript and what you actually see. We select an element, change its content or its classes, and the browser updates instantly.")
cue("Slides 28–29 — Dynamic UI & events")
say("So when you tick off a task or adjust attendance, an event listener runs a handler, updates the data, and re-renders that part of the page. We even use event delegation — one listener handles every task in the list.")
cue("Slide 30 — Forms & validation")
say("Forms are validated in JavaScript too — we stop the default submit, check the input, and show friendly inline errors instead of letting bad data through.")
cue("Slide 31 — Data & persistence")
say("It's all saved to the browser's local storage as JSON, per user, so your workspace survives a refresh — the honest limitation being it's client-side for now, not a backend.")
cue("Slides 32–33 — The logic we coded / beyond the syllabus")
say("And this is where we went beyond the syllabus. The academic numbers aren't stored — they're computed live: your attendance percentage, how many classes you can still miss, and a real CGPA formula. On top of that we added authentication, personalized onboarding, avatars, and connected logic across attendance, CGPA and achievements.")

# --- MANAN CLOSE ---
section("5 · MANAN — Closing", "Slides 34–35 · ~25 sec", "Manan speaks")
cue("Slide 34 — Synora in one view")
say("So this is Synora in one view — a complete, working student workspace.")
cue("Slide 35 — Thank you")
say("We started with the fundamentals from Web Development — HTML, CSS and JavaScript — but we used them to build something much larger: a responsive, personalized productivity platform. Thank you.")

# --- Handoffs ---
rule(); kicker("Speaker handoffs (one line each)", color=SAGE)
for a,b,txt in [("Manan","Atharv","“That's the big picture — Atharv will take you through how we structured it in HTML.”"),
                ("Atharv","Arshpreet","“Once the structure was in place, Arshpreet turned it into Synora's visual system with CSS.”"),
                ("Arshpreet","Manan","“So HTML gives us structure, CSS gives us the look — and Manan will show how JavaScript makes it interactive.”")]:
    p = doc.add_paragraph(); p.paragraph_format.space_after=Pt(3)
    r=p.add_run(f"{a} → {b}:  "); r.bold=True; r.font.color.rgb=TAUPE; r.font.size=Pt(10.5)
    r2=p.add_run(txt); r2.font.size=Pt(10.5)

# --- footer stats ---
rule(); kicker("Length check", color=SAGE)
p = doc.add_paragraph()
p.add_run("Word count: ").bold=True; p.add_run("~655 words.   ")
p.add_run("Estimated speaking time: ").bold=True; p.add_run("~4:40–4:50 at a natural pace (~140 wpm); comfortably under 5 minutes.")

import os
out = os.path.abspath("../Synora_Presentation_Script.docx")
doc.save(out)
print("saved", out)
