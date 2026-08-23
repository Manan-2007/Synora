#!/usr/bin/env python3
# Synora — FINAL comprehensive project presentation (41 slides)
from deckkit import *
from pptx.enum.text import PP_ALIGN as AL, MSO_ANCHOR as AN

IMG = "img/"
LOGO = "../assets/"
OUT = "../Synora_Final_Project_Presentation.pptx"

d = Deck()
ML, MR = 0.7, 0.7
CW = d.W - ML - MR
TOT = 38
NAMES = "Manan Kochhar    ·    Arshpreet Kaur    ·    Atharv Bains"
RED = "C67A6C"; RED_LT = "E0B3A8"; RED_BAND = "382825"; RED_LINE = "6B4A43"

def footer(s, n, dark=False):
    return  # footers removed per request

def head(s, kicker, title, ty=0.6, kcolor=TAUPE, tcolor=TEXT):
    eyebrow(s, ML, ty, kicker, color=kcolor)
    text(s, ML, ty+0.30, CW, 0.9, title, size=29, color=tcolor, bold=True, font=HEAD, spacing=1.0)

def chips_dark(s, labels, x, y, h=0.4):
    for lbl in labels:
        x = chip(s, x, y, lbl, fill=INK_PANEL, tc=CREAM, line=SAGE, size=12, h=h, padx=0.17) + 0.14
    return x

# =====================================================================
# 01 · THE PRODUCT
# =====================================================================
def s01_title():
    s = d.slide(INK, textured=True)
    picw(s, LOGO+"logo-lockup-dark.png", ML, 0.6, 2.1)
    para(s, ML, 2.15, 6.5, 3.0, [
        {'runs':[("One ",43,CREAM,True,HEAD),("calm",43,SAGE_LT,True,HEAD),(" home",43,CREAM,True,HEAD)],'sp':1.02},
        {'runs':[("for everything",43,CREAM,True,HEAD)],'sp':1.02},
        {'runs':[("you're studying.",43,CREAM,True,HEAD)],'sp':1.02},
    ])
    text(s, ML, 4.6, 6.2, 0.5, "Student Productivity & Academic Management Workspace",
         size=14.5, color=MUTED_D)
    chips_dark(s, ["HTML5","CSS3","JavaScript","DOM","Events"], ML, 5.2)
    # submitted by
    text(s, ML, 6.15, 6.2, 0.3, "SUBMITTED BY", size=10, color=TAUPE_LT, bold=True, letter=180)
    text(s, ML, 6.46, 6.5, 0.4, NAMES, size=13, color=CREAM, bold=True)
    pic_card(s, IMG+"dashboard_desktop.png", 7.4, 2.0, w=5.3, shcolor="000000", shalpha=36)
    text(s, 7.4, 5.6, 5.3, 0.3, "The Synora dashboard — a live, working product.",
         size=10.5, color=MUTED_D, italic=True)
    s.notes_slide.notes_text_frame.text = ("Synora is a real, working student-productivity web app built only "
        "with HTML5, CSS3 and vanilla JavaScript. This deck tells the whole story — problem, product, how it's "
        "built, which syllabus concepts it uses, and what we added beyond them. Submitted by Manan Kochhar, "
        "Arshpreet Kaur and Atharv Bains.")

def s02_idea():
    s = d.slide(BG)
    eyebrow(s, ML, 0.62, "01 · The problem", color=RED)
    text(s, ML, 0.95, 10.5, 1.3, "A student's semester is scattered across apps that never talk.",
         size=29, color=TEXT, bold=True, font=HEAD, spacing=1.08)
    tools=[("check-square","To-do app"),("file-text","Sticky notes"),("percent","Attendance sheet"),
           ("calendar","Wall calendar"),("bell","Reminders"),("bar-chart-2","Grades sheet")]
    pos=[(0.95,2.7),(4.7,2.45),(8.45,2.85),(1.45,4.3),(5.2,4.6),(9.0,4.25)]  # deliberately uneven = scattered
    for (ic,lab),(x,y) in zip(tools,pos):
        rect(s, x, y, 2.75, 1.02, fill=SURFACE, line=MIST, lw=1.3, radius=0.14, shadow_=True, shalpha=11)
        icon_chip(s, ic, x+0.22, y+0.25, d=0.52, fill="F0EEEB", icol="slate")
        text(s, x+0.9, y, 1.55, 1.02, lab, size=12.5, color=MUTED, anchor=AN.MIDDLE)
        icon(s, "alert-triangle", x+2.75-0.46, y+0.16, 0.3, "high")   # red disconnect badge
    rect(s, ML, 6.12, CW, 0.78, fill="FBEEE9", line="E8C6BC", lw=1.3, radius=0.12)
    icon_chip(s, "alert-triangle", ML+0.3, 6.26, d=0.5, fill=RED, icol="white")
    rich(s, ML+1.02, 6.12, CW-1.4, 0.78, [("Six apps.  ",15.5,RED,True,HEAD),
        ("Zero that talk to each other — so deadlines slip through the gaps and nothing sees the whole week.",
         13.5,TEXT,False,BODY)], anchor=AN.MIDDLE)
    s.notes_slide.notes_text_frame.text = ("The problem is fragmentation. Six disconnected tools, none sharing "
        "data — deadlines slip, attendance is done by hand, grades live in fragile spreadsheets. The scattered "
        "cards and red warning badges make the pain visible; the red band drives it home.")

def s03_solution():
    s = d.slide(BG)   # light = the relief of the solution
    eyebrow(s, ML, 0.62, "01 · The solution", color=SAGE_DK)
    text(s, ML, 0.95, 10.5, 0.9, "Eight tools, gathered into one calm workspace.",
         size=29, color=TEXT, bold=True, font=HEAD)
    # ordered feature list (calm, the opposite of the scatter before)
    rect(s, ML, 2.0, 3.35, 4.5, fill=SURFACE, line=MIST, lw=1.2, radius=0.1, shadow_=True, shalpha=9)
    feats=[("check-square","Tasks"),("calendar","Calendar"),("feather","Notes"),("grid","Timetable"),
           ("percent","Attendance"),("trending-up","CGPA"),("award","Achievements"),("bell","Notifications")]
    for i,(ic,f) in enumerate(feats):
        yy=2.3+i*0.5
        icon_chip(s, ic, ML+0.3, yy, d=0.36, fill=SAGE_SOFT, icol="sage", ratio=0.56)
        text(s, ML+0.8, yy, 2.4, 0.36, f, size=12.5, color=TEXT, anchor=AN.MIDDLE)
    # converge into the Synora hub
    arrow_right(s, 4.2, 4.25, w=0.5, color=SAGE, h=0.3)
    hub = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(4.85), Inches(3.35), Inches(1.8), Inches(1.8))
    hub.shadow.inherit=False; hub.fill.solid(); hub.fill.fore_color.rgb=rgb(SAGE); hub.line.fill.background()
    shadow(hub, color=INK, alpha=24)
    picw(s, LOGO+"logo-mark-dark.png", 5.5, 3.72, 0.5)
    text(s, 4.85, 4.35, 1.8, 0.4, "Synora", size=15, color="FFFFFF", bold=True, font=HEAD, align=AL.CENTER)
    arrow_right(s, 6.85, 4.25, w=0.5, color=SAGE, h=0.3)
    pic_card(s, IMG+"dashboard_desktop.png", 7.45, 2.35, w=5.2)
    text(s, 7.45, 5.6, 5.2, 0.3, "One dashboard for the whole semester.", size=10.5, color=SLATE, italic=True)
    rich(s, ML, 6.75, CW, 0.4, [("One account.  ",13,SAGE_DK,True,HEAD),
        ("One quiet home — personal to each student, on every device.",12.5,MUTED,False,BODY)])
    footer(s, 3)
    s.notes_slide.notes_text_frame.text = ("The relief beat: the eight scattered tools converge into one calm, "
        "personalized workspace. Same colour language as the app (sage), ordered and quiet — deliberately the "
        "opposite of the previous slide. The dashboard is the payoff.")

def s04_what():
    s = d.slide(BG)
    head(s, "01 · The product", "What is Synora?")
    text(s, ML, 1.62, CW, 0.5,
         "A personalized student productivity workspace — academic planning, task management and performance "
         "tracking in one interface. Its features fall into four groups:",
         size=13.5, color=MUTED, spacing=1.2)
    groups=[("Productivity","check-square",SAGE,[("check-square","Tasks"),("calendar","Calendar"),("feather","Quick Notes")]),
            ("Academic","book-open",TAUPE,[("grid","Timetable"),("percent","Attendance"),("trending-up","CGPA")]),
            ("Progress","award",SAGE,[("award","Achievements"),("bell","Notifications")]),
            ("Personalization","user",TAUPE,[("user","Profile"),("layers","Subjects"),("eye","Avatar & Theme")])]
    cw=2.86; gap=(CW-4*cw)/3; y=2.5; ch=4.0
    for i,(gname,gic,gcol,items) in enumerate(groups):
        x=ML+i*(cw+gap)
        rect(s, x, y, cw, ch, fill=SURFACE, line=MIST, lw=1.2, radius=0.08, shadow_=True, shalpha=9)
        icon_chip(s, gic, x+0.28, y+0.3, d=0.62, fill=gcol, icol="white")
        text(s, x+1.02, y+0.3, cw-1.1, 0.62, gname, size=14.5, color=TEXT, bold=True, font=HEAD, anchor=AN.MIDDLE)
        hline(s, x+0.28, y+1.16, cw-0.56, color=MIST, weight=1.0)
        for j,(ic,lab) in enumerate(items):
            yy=y+1.4+j*0.62
            icon_chip(s, ic, x+0.3, yy, d=0.4, fill=SAGE_SOFT, icol=("sage" if gcol==SAGE else "taupe"), ratio=0.56)
            text(s, x+0.82, yy, cw-0.9, 0.4, lab, size=12.5, color=TEXT, anchor=AN.MIDDLE)
    footer(s, 4)
    s.notes_slide.notes_text_frame.text = ("Four feature families: Productivity (tasks/calendar/notes), Academic "
        "(timetable/attendance/CGPA), Progress (achievements/notifications), Personalization (profile/subjects/"
        "avatar/theme). Everything is per-user and saved on-device.")

def s05_dashboard():
    s = d.slide(BG)
    head(s, "01 · The product", "The Synora dashboard")
    pic_card(s, IMG+"dashboard_desktop.png", ML, 1.62, w=8.0)
    callouts=[("user","Profile & greeting"),("check-square","Today's tasks"),("clock","Due / overdue counts"),
              ("trending-up","Weekly progress ring"),("calendar","Month at a glance"),("bell","Live notifications")]
    x2=8.95; y=1.7
    for i,(ic,t) in enumerate(callouts):
        yy=y+i*0.82
        icon_chip(s, ic, x2, yy, d=0.5, fill=(SAGE if i%2==0 else TAUPE), icol="white")
        text(s, x2+0.66, yy, 3.1, 0.5, t, size=13, color=TEXT, bold=True, anchor=AN.MIDDLE)
    footer(s, 5)
    s.notes_slide.notes_text_frame.text = ("The dashboard is the home screen: greeting + streak, task counts, "
        "today's tasks, a progress ring and a mini-calendar. It pulls from every feature, so it doubles as the "
        "product overview.")

def s06_stack():
    s = d.slide(BG)
    head(s, "01 · The product", "Technology stack")
    text(s, ML, 1.62, 8.0, 0.5, "Core web technologies only — no frameworks, no build step.", size=14, color=MUTED)
    rows=[("code","HTML5","Structure & semantics",SAGE),
          ("layers","CSS3","Design system + responsive layout",TAUPE),
          ("cpu","JavaScript","Logic, state & interactivity",SAGE),
          ("git-branch","DOM APIs","A live, dynamic interface",TAUPE),
          ("database","localStorage","Per-user persistence in the browser",SAGE),
          ("github","Git & GitHub","Version control",SLATE)]
    y0=2.35; rh=0.66; gap=0.12; rw=8.0
    for i,(ic,a,b,col) in enumerate(rows):
        y=y0+i*(rh+gap)
        rect(s, ML, y, rw, rh, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=8)
        icon_chip(s, ic, ML+0.16, y+(rh-0.46)/2, d=0.46, fill=col, icol="white")
        text(s, ML+0.85, y, 2.6, rh, a, size=15, color=TEXT, bold=True, font=HEAD, anchor=AN.MIDDLE)
        text(s, ML+3.6, y, rw-3.7, rh, b, size=12.5, color=MUTED, anchor=AN.MIDDLE)
    # illustration: the layers, stacked (HTML the base → Events on top)
    iw=3.6; _,(ix,iy,iww,ihh)=picw(s, IMG+"illo_stack.png", 9.55, 2.35, iw)
    rich(s, 8.9, iy+ihh-0.05, 4.0, 0.3, [("HTML",11,TEXT,True,MONO),(" → ",11,SLATE,False,BODY),
        ("CSS",11,SAGE_DK,True,MONO),(" → ",11,SLATE,False,BODY),("JS",11,SAGE_DK,True,MONO),
        (" → ",11,SLATE,False,BODY),("DOM",11,SAGE_DK,True,MONO),(" → ",11,SLATE,False,BODY),
        ("Events",11,TAUPE,True,MONO)], align=AL.CENTER)
    footer(s, 6)
    s.notes_slide.notes_text_frame.text = ("Deliberately minimal stack: HTML5, CSS3, vanilla JS, localStorage for "
        "persistence, Git/GitHub for version control. No React, no bundler — the syllabus building blocks are the "
        "whole toolkit. localStorage is genuinely used (16 call-sites).")

def s07_together():
    s = d.slide(INK, textured=True)
    eyebrow(s, ML, 0.6, "01 · The product", color=TAUPE_LT)
    text(s, ML, 0.9, CW, 0.6, "How the technologies work together", size=28, color=CREAM, bold=True, font=HEAD)
    text(s, ML, 1.78, CW, 0.5, "Each layer answers one question — together they are the product.",
         size=14, color=MUTED_D)
    steps=[("code","HTML5","What exists?"),("layers","CSS3","How it looks?"),
           ("cpu","JavaScript","How it behaves?"),("git-branch","DOM","How JS changes it?"),
           ("database","Storage","How it persists?")]
    flow_line(s, steps, ML, 2.95, CW, color=SAGE, alt=TAUPE, dark=True, node_d=1.0,
              label_size=15.5, sub_size=12)
    rect(s, ML, 5.8, CW, 0.9, fill=SAGE, radius=0.09, shadow_=True, shcolor="000000", shalpha=26)
    rich(s, ML, 5.8, CW, 0.9, [("Five layers, one product  —  ",15,"EAF0EA",False,BODY),
                               ("Synora",17,"FFFFFF",True,HEAD)], align=AL.CENTER, anchor=AN.MIDDLE)
    footer(s, 7, dark=True)
    s.notes_slide.notes_text_frame.text = ("The conceptual spine of the deck. Each layer answers one question — "
        "HTML what exists, CSS how it looks, JS how it behaves, DOM how JS changes the page, storage how it "
        "persists. Together they are Synora. Likely viva Q: how do HTML/CSS/JS relate?")

# =====================================================================
# ARCHITECTURE
# =====================================================================
def s08_arch():
    s = d.slide(BG)
    head(s, "02 · Architecture", "How the project is structured")
    text(s, ML, 1.6, 7.4, 0.4, "No framework, no build step — files a browser opens directly. "
         "One page and one module per feature.", size=12.5, color=MUTED)
    F=True
    nodes=[
        ("index.html","Landing page",False),
        ("notes.html","Project & viva doc",False),
        ("README.md","Documentation",False),
        ("app/","the signed-in workspace",F,[
            ("dashboard.html","Home overview",False),
            ("tasks.html","Task manager",False),
            ("cgpa.html","CGPA calculator",False),
            ("… 10 more","timetable, attendance …",False)]),
        ("scripts/","18 vanilla-JS modules",F,[
            ("app.js","Shared core + helpers",False),
            ("storage.js","localStorage layer",False),
            ("… 16 more","auth, theme, tasks …",False)]),
        ("styles/","7 stylesheets",F,[
            ("tokens.css","Design tokens",False),
            ("… 6 more","base, components …",False)]),
        ("assets/","logos · avatars · icons",F),
    ]
    rect(s, ML, 2.18, 7.35, 4.55, fill=SURFACE, line=MIST, lw=1.2, radius=0.06, shadow_=True, shalpha=10)
    render_tree(s, ML+0.5, 2.42, "Synora/", nodes, size=10.5, lh=1.36, name_gap=2, w=6.9)
    # EDUCA-style big-number stat cards
    stats=[("14","HTML pages",SAGE),("7","CSS files",TAUPE),("18","JS modules",SAGE),("0","frameworks",TAUPE)]
    sx=8.5; sw=4.15; y0=2.18; sh=1.02; sgap=0.15
    for i,(num,lab,col) in enumerate(stats):
        y=y0+i*(sh+sgap)
        rect(s, sx, y, sw, sh, fill=SURFACE, line=MIST, lw=1.2, radius=0.1, shadow_=True, shalpha=9)
        text(s, sx+0.3, y, 1.5, sh, num, size=38, color=col, bold=True, font=HEAD, anchor=AN.MIDDLE)
        vline(s, sx+1.75, y+0.24, sh-0.48, color=MIST, weight=1.4)
        text(s, sx+2.0, y, sw-2.1, sh, lab, size=14, color=TEXT, bold=True, anchor=AN.MIDDLE)
    s.notes_slide.notes_text_frame.text = ("Real project tree with headline counts: 14 HTML pages (index + 13 app "
        "pages), 7 stylesheets, 18 JS modules, and ZERO frameworks. One page + one module per feature, no build "
        "step — the browser opens the files directly.")

def s09_dataflow():
    s = d.slide(BG)
    head(s, "02 · Architecture", "Data flow")
    flow_line(s, [("user","User"),("lock","Sign in"),("sliders","Personalize"),("layers","Profile + Subjects")],
              ML, 1.95, CW, color=SAGE, node_d=0.82, label_size=13.5)
    arrow_down(s, d.W/2, 3.25, h=0.38, color=TAUPE)
    text(s, 0, 3.72, d.W, 0.3, "SUBJECTS ARE THE SOURCE OF TRUTH", size=12, color=TAUPE, bold=True, align=AL.CENTER, letter=140)
    text(s, 0, 4.04, d.W, 0.3, "every academic feature references a subject by its id", size=11.5, color=MUTED, align=AL.CENTER)
    feat=[("check-square","Tasks"),("feather","Notes"),("grid","Timetable"),("percent","Attendance"),("trending-up","CGPA"),("award","Achievements")]
    cw=1.85; total=6*cw+5*0.16; x0=(d.W-total)/2; fy=4.5
    for i,(ic,t) in enumerate(feat):
        x=x0+i*(cw+0.16)
        rect(s, x, fy, cw, 0.95, fill=SURFACE, line=MIST, lw=1.2, radius=0.1, shadow_=True, shalpha=8)
        icon_chip(s, ic, x+(cw-0.5)/2, fy+0.15, d=0.5, fill=TAUPE, icol="white")
        text(s, x, fy+0.63, cw, 0.28, t, size=11, color=TEXT, bold=True, align=AL.CENTER)
    arrow_down(s, d.W/2, 5.6, h=0.34, color=TAUPE)
    rect(s, ML+3.3, 6.06, CW-6.6, 0.84, fill=INK, radius=0.1, shadow_=True, shcolor=INK, shalpha=22)
    rich(s, ML+3.3, 6.06, CW-6.6, 0.84, [("Dashboard",16,CREAM,True,HEAD),
         ("   —  one live view of everything",13,MUTED_D,False,BODY)], align=AL.CENTER, anchor=AN.MIDDLE)
    footer(s, 9)
    s.notes_slide.notes_text_frame.text = ("Data flows from sign-in through personalization into a per-user "
        "profile and subject list. Subjects are the single source of truth — attendance, CGPA and timetable all "
        "reference a subject by id, so renaming it once renames it everywhere. Everything rolls up to the dashboard.")

# =====================================================================
# 03 · HTML  (≥6 slides: 10-19)
# =====================================================================
def s10_html_structure():
    s = d.slide(BG)
    head(s, "03 · HTML5", "The structure behind Synora")
    text(s, ML, 1.66, 5.5, 1.6,
         "Every page is written with semantic HTML5 — elements that describe what each region means, not just "
         "how it looks. The browser, assistive tech and our own JavaScript all read that same structure.",
         size=13.5, color=MUTED, spacing=1.3)
    tags=[("header","site header + nav"),("main","×14 primary content"),("section","×11 labelled regions"),
          ("aside","×12 sidebar"),("footer","landing footer"),("figure","×3 media")]
    for i,(t,note) in enumerate(tags):
        yy=3.4+i*0.5
        icon_chip(s, "code", ML, yy-0.02, d=0.36, fill=SAGE_SOFT, icol="sage", ratio=0.56)
        rich(s, ML+0.5, yy, 5.2, 0.4, [("<"+t+">", 13, SAGE_DK, True, MONO), ("   "+note, 11, SLATE, False, BODY)],
             anchor=AN.MIDDLE)
    code_panel(s, 6.55, 1.62, 6.12, [
        [("<header ", C_FN),("class",C_KEY),("=",C_DEF),('"site-header"',C_STR),(">",C_FN)],
        [("  <nav ",C_FN),("aria-label",C_KEY),("=",C_DEF),('"Primary"',C_STR),("> … </nav>",C_FN)],
        [("</header>",C_FN)],
        [("",C_DEF)],
        [("<main ",C_FN),("id",C_KEY),("=",C_DEF),('"main"',C_STR),(">",C_FN)],
        [("  <section ",C_FN),("class",C_KEY),("=",C_DEF),('"hero"',C_STR),(">…</section>",C_FN)],
        [("  <section ",C_FN),("aria-labelledby",C_KEY),("=",C_DEF),('"features"',C_STR),(">…",C_FN)],
        [("  </section>",C_FN)],
        [("</main>",C_FN)],
        [("<footer ",C_FN),("class",C_KEY),("=",C_DEF),('"site-footer"',C_STR),(">…</footer>",C_FN)],
    ], size=12.5, title="index.html — landing structure")
    text(s, 6.55, 6.6, 6.12, 0.3, "Real markup from index.html — trimmed.", size=10, color=SLATE, italic=True)
    footer(s, 10)
    s.notes_slide.notes_text_frame.text = ("Semantic tags carry meaning: header/nav/main/section/aside/footer, "
        "with aria-labelledby tying a heading to its region. Viva: why semantic HTML? Accessibility, SEO, and a "
        "structure our JS can target reliably.")

def _journey_card(s, img, x, w, label):
    _,(_,_,ww,hh)=pic_card(s, IMG+img, x, 2.35, w=w)
    text(s, x, 2.35+hh+0.08, ww, 0.3, label, size=11, color=TEXT, bold=True, align=AL.CENTER)
    return x+w

def s11_journey():
    s = d.slide(BG)
    head(s, "03 · HTML5", "User journey: landing to workspace")
    text(s, ML, 1.62, CW, 0.4, "Five HTML pages, one continuous flow — structure and links carry the user through.",
         size=13.5, color=MUTED)
    stages=[("landing_desktop.png","Landing","index.html"),("signup.png","Sign up","signup.html"),
            ("onboarding.png","Personalize","onboarding.html"),("dashboard_desktop.png","Dashboard","dashboard.html")]
    w=2.78; gap=(CW-4*w)/3
    x=ML
    for i,(img,lab,fn) in enumerate(stages):
        _,(_,_,ww,hh)=pic_card(s, IMG+img, x, 2.6, w=w)
        shot_tag(s, x+0.15, 2.44, fn, color=(SAGE if i%2==0 else TAUPE), size=9)
        text(s, x, 2.6+hh+0.1, ww, 0.3, lab, size=12, color=TEXT, bold=True, align=AL.CENTER)
        if i<3: chevron_right(s, x+w+gap/2-0.1, 2.6+hh/2, size=0.24, color=TAUPE)
        x+=w+gap
    text(s, ML, 5.7, CW, 0.7,
         "Each page is a self-contained HTML document; anchors and links move between them, and the same "
         "navigation structure repeats so the product feels like one continuous space.",
         size=12.5, color=MUTED, spacing=1.28)
    footer(s, 11)
    s.notes_slide.notes_text_frame.text = ("Walk the flow: landing → sign up → personalize → dashboard. Emphasise "
        "that HTML provides the page structure and navigation that stitches the journey together.")

def s12_landing():
    s = d.slide(BG)
    head(s, "03 · HTML5", "The landing page")
    _,(_,_,lw,lh)=pic_card(s, IMG+"landing_desktop.png", ML, 1.72, w=7.65)
    shot_tag(s, ML+0.2, 1.56, "index.html", color=SAGE)
    text(s, ML, 1.72+lh+0.08, 7.65, 0.3, "Hero, navigation and marketing sections.", size=10.5, color=SLATE, italic=True)
    secs=[("layout","Hero","headline + product preview"),("menu","Navbar","centred links + theme + auth"),
          ("grid","Features / How it works","semantic sections with IDs"),
          ("hash","FAQ (CSS-only)","accordion, no JavaScript"),("edit-3","Contact","a real, validated form"),
          ("chevron-right","Footer","links + sitemap")]
    x2=8.55; y=1.66
    for i,(ic,t,b) in enumerate(secs):
        yy=y+i*0.86
        icon_chip(s, ic, x2, yy, d=0.5, fill=(SAGE if i%2==0 else TAUPE), icol="white")
        text(s, x2+0.62, yy-0.04, 3.4, 0.35, t, size=12, color=TEXT, bold=True)
        text(s, x2+0.62, yy+0.28, 3.4, 0.35, b, size=10, color=MUTED)
    footer(s, 12)
    s.notes_slide.notes_text_frame.text = ("The landing page is built from labelled <section> blocks with anchor "
        "navigation. Notably the FAQ accordion and mobile menu are pure CSS (a hidden checkbox) — no JS. "
        "Contact is a real validated form. Viva: which parts need no JavaScript? The menu and FAQ.")

def s13_account():
    s = d.slide(BG)
    head(s, "03 · HTML5", "The account flow")
    _,(_,_,aw,ah)=pic_card(s, IMG+"signup.png", ML, 1.62, w=6.6)
    shot_tag(s, ML+0.2, 1.46, "signup.html", color=SAGE)
    text(s, ML, 1.62+ah+0.08, 6.6, 0.3, "One form, the right input type per field.", size=10.5, color=SLATE, italic=True)
    steps=[("Sign up","first & last name, username, email, password"),
           ("Confirmation","account created, stored on this device"),
           ("Personalize","the onboarding wizard sets up the workspace"),
           ("Dashboard","the populated product")]
    y=1.72
    for i,(t,b) in enumerate(steps):
        yy=y+i*0.98
        icon_chip(s, "chevron-right", 7.45, yy, d=0.44, fill=SAGE, icol="white", ratio=0.5)
        text(s, 8.0, yy-0.04, 4.55, 0.35, f"{i+1}.  {t}", size=13, color=TEXT, bold=True)
        text(s, 8.0, yy+0.32, 4.55, 0.5, b, size=10.5, color=MUTED, spacing=1.15)
        if i<3: text(s, 7.63, yy+0.48, 0.4, 0.4, "│", size=12, color=MIST)
    text(s, 7.45, 5.95, 5.15, 0.7, "Input types — text, email, password — give the right keyboard and the "
         "browser's first check.", size=11, color=MUTED, spacing=1.22)
    footer(s, 13)
    s.notes_slide.notes_text_frame.text = ("Sign up collects first/last name, username, email, password + confirm. "
        "Each field uses the correct input type (email/password), which sets the keyboard and gives the browser's "
        "native validation. Then confirmation → personalization → dashboard.")

def s14_personalize():
    s = d.slide(BG)
    head(s, "03 · HTML5", "Personalization: building the workspace")
    pic_card(s, IMG+"onboarding.png", ML, 1.62, w=6.5)
    text(s, ML, 5.55, 6.5, 0.3, "app/onboarding.html — a six-step wizard of HTML form controls.", size=10.5, color=SLATE, italic=True)
    steps=[("user","Profile","avatar illustration or initials"),
           ("book-open","Academic","program + semester"),
           ("layers","Subjects","name, credits, track attendance?"),
           ("percent","Attendance","target percentage"),
           ("eye","Appearance","light or dark theme")]
    y=1.66
    for i,(ic,t,b) in enumerate(steps):
        yy=y+i*0.9
        icon_chip(s, ic, 7.35, yy, d=0.5, fill=(SAGE if i%2==0 else TAUPE), icol="white")
        text(s, 8.0, yy-0.04, 4.6, 0.35, t, size=13, color=TEXT, bold=True)
        text(s, 8.0, yy+0.3, 4.6, 0.4, b, size=11, color=MUTED)
    footer(s, 14)
    s.notes_slide.notes_text_frame.text = ("Onboarding is a wizard of HTML form controls — radio-style avatar "
        "picker, selects for program/semester, repeatable subject rows with a checkbox for attendance tracking, a "
        "number input for the target, and a theme choice. This is where each user's workspace is shaped.")

def _feat_walk(s, n, kicker, title, trio, note):
    head(s, kicker, title)
    w=3.9; gap=(CW-3*w)/2; x=ML; ytop=1.98
    for ic,img,name,role,col in trio:
        _,(_,_,ww,hh)=pic_card(s, IMG+img+".png", x, ytop, w=w)
        shot_tag(s, x+0.2, ytop-0.16, img+".html", color=col)
        icon_chip(s, ic, x+0.05, ytop+hh+0.12, d=0.46, fill=col, icol="white")
        text(s, x+0.61, ytop+hh+0.09, ww-0.6, 0.35, name, size=13.5, color=TEXT, bold=True, font=HEAD, anchor=AN.MIDDLE)
        text(s, x, ytop+hh+0.6, ww, 0.5, role, size=10.5, color=MUTED, align=AL.CENTER, spacing=1.1)
        x+=w+gap
    text(s, ML, 6.62, CW, 0.4, note, size=11.5, color=SLATE, italic=True, align=AL.CENTER)
    footer(s, n)

def s15_prod():
    s = d.slide(BG)
    _feat_walk(s, 15, "03 · HTML5", "Feature walkthrough — Productivity",
        [("check-square","tasks","Tasks","Create, prioritise, complete — filtered by today / upcoming / overdue",SAGE),
         ("calendar","calendar","Calendar","Every deadline on one timeline; click a day to see what's due",TAUPE),
         ("feather","notes","Quick Notes","Jot lecture notes as cards, tagged by subject",SAGE)],
        "Structured HTML — lists, cards, forms and controls — gives each feature its shape.")
    s.notes_slide.notes_text_frame.text = ("Productivity trio: Tasks (priorities + filters), Calendar (deadline "
        "timeline), Quick Notes (subject-tagged cards). Each is structured HTML — lists, cards, forms — before any "
        "styling or scripting.")

def s16_acad():
    s = d.slide(BG)
    _feat_walk(s, 16, "03 · HTML5", "Feature walkthrough — Academic tools",
        [("grid","timetable","Timetable","Your week of classes as an editable grid",SAGE),
         ("percent","attendance","Attendance","How many classes you can still miss, per subject",TAUPE),
         ("trending-up","cgpa","CGPA","Live 10-point GPA as you enter credits and grades",SAGE)],
        "Cards, labels, form controls and chart containers structure the academic data.")
    s.notes_slide.notes_text_frame.text = ("Academic trio: Timetable (weekly grid), Attendance (how many classes "
        "you can skip and stay above target), CGPA (live 10-point calculator). Note the labelled cards and the "
        "chart containers that JS later fills.")

def s17_progress():
    s = d.slide(BG)
    _feat_walk(s, 17, "03 · HTML5", "Feature walkthrough — Progress & account",
        [("award","achievements","Achievements","Small wins unlock as you actually use Synora",SAGE),
         ("bell","notifications","Notifications","Deadlines, attendance warnings and unlocks in one place",TAUPE),
         ("settings","settings","Settings","Profile, subjects, appearance and account",SAGE)],
        "Status indicators, controls and structured lists — all built from semantic HTML.")
    s.notes_slide.notes_text_frame.text = ("Progress + account trio: Achievements (gamified milestones), "
        "Notifications (reconciled deadline/attendance alerts), Settings (edit profile/subjects/theme). Structured "
        "lists and controls throughout.")

def s18_forms():
    s = d.slide(BG)
    head(s, "03 · HTML5", "Forms & accessibility")
    _,(_,_,fw,fh)=pic_card(s, IMG+"settings.png", ML, 1.62, w=6.7)
    shot_tag(s, ML+0.2, 1.46, "settings.html", color=SAGE)
    text(s, ML, 1.62+fh+0.08, 6.7, 0.3, "Every field has a real <label> and the right input type.",
         size=10.5, color=SLATE, italic=True)
    items=[("edit-3","Labelled inputs","16 <label> elements — a label focuses its field"),
           ("eye","ARIA where it helps","91 aria-* attributes — labels, live regions"),
           ("check-circle","Right input types","email, number, date, password"),
           ("layout","Alt text","18 alt attributes; decorative art hidden"),
           ("move","Keyboard-friendly","a skip-link + a .visually-hidden pattern")]
    y=1.7
    for ic,t,b in items:
        icon_chip(s, ic, 7.65, y, d=0.5, fill=SAGE, icol="white")
        text(s, 8.28, y-0.02, 4.3, 0.35, t, size=12.5, color=TEXT, bold=True)
        text(s, 8.28, y+0.3, 4.3, 0.5, b, size=10, color=MUTED, spacing=1.12)
        y+=0.92
    footer(s, 18)
    s.notes_slide.notes_text_frame.text = ("Honest framing: accessibility BASICS, not certified WCAG. Genuinely "
        "present: 16 labels, 91 aria-*, correct input types, 18 alt attributes, a skip-link and a visually-hidden "
        "utility. Viva: what makes a form accessible? Programmatic label-to-input association and correct types.")

def s19_html_applied():
    s = d.slide(BG)
    head(s, "03 · HTML5", "What we actually applied")
    items=[("HTML5 document structure",1),("Semantic elements (header/main/section/aside/footer)",1),
           ("Forms & the right input types",1),("Labels & ARIA attributes",1),
           ("Accessibility basics (skip-link, alt, visually-hidden)",1),
           ("Anchor navigation between sections & pages",1),
           ("Figure / media elements",1),("Full WCAG certification",0)]
    y=1.9
    for lab,ok in items:
        icon_chip(s, ("check-circle" if ok else "alert-triangle"), ML, y, d=0.44,
                  fill=(SAGE if ok else MIST), icol=("white" if ok else "slate"), ratio=0.5)
        text(s, ML+0.62, y, 7.5, 0.44, lab, size=13.5, color=(TEXT if ok else SLATE), anchor=AN.MIDDLE)
        y+=0.58
    rect(s, 9.0, 1.9, 3.65, 4.2, fill=INK, radius=0.06, shadow_=True, shcolor=INK, shalpha=22)
    text(s, 9.3, 2.2, 3.1, 0.4, "TAKEAWAY", size=11, color=TAUPE_LT, bold=True, letter=180)
    text(s, 9.3, 2.68, 3.1, 3.2, "HTML gives Synora its structure and meaning — the skeleton every other layer "
         "builds on.", size=15.5, color=CREAM, spacing=1.3)
    footer(s, 19)
    s.notes_slide.notes_text_frame.text = ("Honest HTML scorecard — everything ticked is genuinely in the code. "
        "The one open item is full WCAG certification, which we did not test for; we implemented the basics. "
        "Transition line: HTML gives structure; next, CSS turns it into a product.")

# =====================================================================
# 04 · CSS (20-27)
# =====================================================================
def s20_designsystem():
    s = d.slide(BG)
    head(s, "04 · CSS3", "One design system, not many pages")
    text(s, ML, 1.62, 6.0, 1.0,
         "CSS custom properties define the visual language once — 120+ design tokens (85 unique) for colour, "
         "type, spacing, radius and shadow, reused across every page so the product feels like one system.",
         size=13, color=MUTED, spacing=1.26)
    pal=[("Ink","22252B"),("Sage","53655C"),("Slate","A3AEB1"),("Mist","E5E8EB"),("Taupe","B09F95")]
    sw=1.5; gap=0.18; x0=ML
    for i,(nm,hx) in enumerate(pal):
        x=x0+i*(sw+gap)
        rect(s, x, 3.05, sw, 1.02, fill=hx, radius=0.1, line=MIST, lw=1.0, shadow_=True, shalpha=10)
        text(s, x, 4.16, sw, 0.3, nm, size=12, color=TEXT, bold=True, align=AL.CENTER)
        text(s, x, 4.43, sw, 0.3, "#"+hx, size=9.5, color=SLATE, align=AL.CENTER, font=MONO)
    rect(s, ML, 5.05, 4.4, 1.5, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=8)
    text(s, ML+0.3, 5.22, 3.9, 0.4, "TYPOGRAPHY", size=10.5, color=TAUPE, bold=True, letter=140)
    text(s, ML+0.3, 5.56, 3.9, 0.5, "Manrope", size=20, color=TEXT, bold=True, font=HEAD)
    text(s, ML+0.3, 6.0, 3.9, 0.4, "headings  ·  Inter for body", size=12, color=MUTED)
    rect(s, ML+4.7, 5.05, 4.4, 1.5, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=8)
    text(s, ML+5.0, 5.22, 3.9, 0.4, "REUSED COMPONENTS", size=10.5, color=TAUPE, bold=True, letter=140)
    text(s, ML+5.0, 5.58, 3.9, 0.5, ".btn  .card  .field  .chip", size=15, color=SAGE_DK, bold=True, font=MONO)
    text(s, ML+5.0, 6.0, 3.9, 0.4, "defined once, used everywhere", size=12, color=MUTED)
    pic_card(s, IMG+"notes.png", 9.35, 2.0, w=3.35)
    text(s, 9.35, 4.16, 3.35, 0.4, "Same cards, buttons and\nspacing tokens on every page.", size=10, color=SLATE, italic=True, spacing=1.1)
    footer(s, 20)
    s.notes_slide.notes_text_frame.text = ("CSS built a design SYSTEM, not per-page styling. tokens.css holds "
        "120+ token definitions (85 unique names); light/dark themes swap the same tokens. Viva: why CSS "
        "variables? Single source of truth — change a token, the whole app updates.")

def s_tokens():
    s = d.slide(BG)
    head(s, "04 · CSS3", "One file defines everything — tokens.css")
    text(s, ML, 1.62, 6.6, 0.7, "Every colour, font, space, radius and shadow is a CSS custom property in a "
         "single :root block — the one source of truth the whole app reads from.", size=13, color=MUTED, spacing=1.28)
    code_panel(s, ML, 2.55, 6.75, [
        [(":root",C_FN),(" {",C_DEF)],
        [("  --color-bg",C_KEY),(":      ",C_DEF),("#FAF9F7",C_STR),(";",C_DEF)],
        [("  --color-brand",C_KEY),(":   ",C_DEF),("#53655C",C_STR),(";",C_DEF),("   /* sage */",C_COM)],
        [("  --color-text",C_KEY),(":    ",C_DEF),("#22252B",C_STR),(";",C_DEF)],
        [("  --font-heading",C_KEY),(": ",C_DEF),('"Manrope", …',C_STR),(";",C_DEF)],
        [("  --space-16",C_KEY),(":      ",C_DEF),("16px",C_NUM),(";",C_DEF)],
        [("  --radius-lg",C_KEY),(":     ",C_DEF),("16px",C_NUM),(";",C_DEF)],
        [("  --shadow-sm",C_KEY),(":     ",C_DEF),("0 1px 3px …",C_NUM),(";",C_DEF)],
        [("}",C_DEF)],
        [("",C_DEF)],
        [("[data-theme=",C_FN),('"dark"',C_STR),("]",C_FN),(" {",C_DEF),("        /* same names,",C_COM)],
        [("  --color-bg",C_KEY),(":    ",C_DEF),("#16181C",C_STR),(";",C_DEF)],
        [("  --color-brand",C_KEY),(": ",C_DEF),("#8FA697",C_STR),(";",C_DEF),("      new values */",C_COM)],
        [("}",C_DEF)],
    ], size=12, title="styles/tokens.css")
    x2=7.75
    text(s, x2, 1.72, 4.9, 0.3, "WHAT IT ORGANISES", size=10.5, color=TAUPE, bold=True, letter=140)
    cats=[("eye","Colour","surfaces · text · brand · status",SAGE),
          ("hash","Typography","Manrope + Inter, a type scale",TAUPE),
          ("move","Spacing","4px base — space-4 … space-128",SAGE),
          ("layout","Radii","sm · md · lg · xl · pill",TAUPE),
          ("layers","Elevation","shadow-sm … shadow-xl",SAGE),
          ("refresh-cw","Motion","easing curves + durations",TAUPE)]
    y=2.15
    for ic,t,b,col in cats:
        icon_chip(s, ic, x2, y, d=0.46, fill=col, icol="white")
        text(s, x2+0.62, y-0.03, 4.3, 0.3, t, size=12.5, color=TEXT, bold=True)
        text(s, x2+0.62, y+0.25, 4.3, 0.3, b, size=10.5, color=MUTED, font=MONO)
        y+=0.62
    rect(s, x2, 6.02, 4.9, 0.82, fill=INK, radius=0.09, shadow_=True, shcolor=INK, shalpha=22)
    text(s, x2+0.3, 6.02, 4.35, 0.82, "Components never hard-code a value — they read a token. One :root, "
         "~85 tokens; dark mode just re-declares the same names.", size=11.5, color=CREAM, anchor=AN.MIDDLE, spacing=1.18)
    s.notes_slide.notes_text_frame.text = ("tokens.css is the single source of truth. Everything — colour, type, "
        "spacing, radii, shadows, motion — is a CSS custom property in one :root block, grouped by category so "
        "it stays organised. Components read the tokens instead of hard-coding values, and dark mode simply "
        "re-declares the same names with new values, which is why one theme attribute flips the whole app. Viva: "
        "why :root? It's the top-level scope, so every element inherits the variables.")

def s21_boxmodel():
    s = d.slide(BG)
    head(s, "04 · CSS3", "The box model behind the interface")
    bx,by,bw,bh=ML,1.78,4.5,2.95
    rect(s, bx,by,bw,bh, fill="EFE7DF", radius=0.03); text(s, bx+0.12,by+0.07,2,0.3,"margin",size=10,color=TAUPE,bold=True)
    rect(s, bx+0.5,by+0.4,bw-1.0,bh-0.8, fill="DCE3DC", radius=0.03); text(s, bx+0.62,by+0.46,2,0.3,"border",size=10,color=SAGE_DK,bold=True)
    rect(s, bx+0.95,by+0.78,bw-1.9,bh-1.56, fill="E9EDF0", radius=0.03); text(s, bx+1.07,by+0.84,2,0.3,"padding",size=10,color=SLATE,bold=True)
    rect(s, bx+1.5,by+1.16,bw-3.0,bh-2.32, fill=SURFACE, radius=0.05, line=MIST, lw=1.0)
    text(s, bx+1.5,by+1.16,bw-3.0,bh-2.32,"content",size=12,color=TEXT,bold=True,align=AL.CENTER,anchor=AN.MIDDLE)
    text(s, bx,by+bh+0.12,bw,0.3,"content → padding → border → margin",size=11.5,color=MUTED,align=AL.CENTER)
    code_panel(s, 5.9, 1.78, 6.75, [
        [(".stat-card",C_FN),(" {",C_DEF)],
        [("  padding",C_KEY),(": ",C_DEF),("20px 24px",C_NUM),(";",C_DEF),("      /* space inside */",C_COM)],
        [("  background",C_KEY),(": ",C_DEF),("var(--color-surface)",C_STR),(";",C_DEF)],
        [("  border",C_KEY),(": ",C_DEF),("1px solid ",C_NUM),("var(--color-border)",C_STR),(";",C_DEF)],
        [("  border-radius",C_KEY),(": ",C_DEF),("var(--radius-lg)",C_STR),(";",C_DEF)],
        [("  box-shadow",C_KEY),(": ",C_DEF),("var(--shadow-sm)",C_STR),(";",C_DEF)],
        [("}",C_DEF)],
    ], size=12.5, title="styles/app.css — a dashboard stat card")
    text(s, ML, 5.22, CW, 0.3, "Those same tokens build every card — here, the CGPA summary row:",
         size=12, color=TEXT, bold=True)
    stw=9.0; pic_card(s, IMG+"cgpa_cards.png", (d.W-stw)/2, 5.58, w=stw)
    footer(s, 21)
    s.notes_slide.notes_text_frame.text = ("Every card is a box. .stat-card sets padding (space inside), a 1px "
        "border, rounded corners and a soft shadow — all via tokens. Viva: name the four box-model layers inside "
        "out — content, padding, border, margin.")

def s22_flex():
    s = d.slide(BG)
    head(s, "04 · CSS3", "Flexbox — alignment & flow")
    pic_card(s, IMG+"tasks.png", ML, 1.7, w=6.3)
    text(s, ML, 5.75, 6.3, 0.3, "The Tasks toolbar — search, sort and view controls in a flex row.", size=10.5, color=SLATE, italic=True)
    text(s, 7.2, 1.7, 5.4, 0.4, "One-dimensional layout", size=15, color=SAGE_DK, bold=True, font=HEAD)
    props=[("display: flex","lay children out in a row"),
           ("align-items: center","vertically centre them"),
           ("gap","even spacing without margins"),
           ("flex-wrap: wrap","fold onto the next line when tight")]
    y=2.3
    for c,b in props:
        icon_chip(s, "move", 7.2, y, d=0.42, fill=SAGE_SOFT, icol="sage", ratio=0.55)
        rich(s, 7.75, y-0.02, 4.85, 0.35, [(c, 12.5, SAGE_DK, True, MONO)])
        text(s, 7.75, y+0.3, 4.85, 0.35, b, size=11, color=MUTED)
        y+=0.82
    text(s, 7.2, 5.75, 5.4, 0.5, "Used in ~116 rules — top bar, toolbars, button groups, list rows.",
         size=11.5, color=SLATE)
    footer(s, 22)
    s.notes_slide.notes_text_frame.text = ("Flexbox handles one-dimensional rows: the sticky top bar, toolbars, "
        "button groups (116 rules). Properties actually used: display:flex, align-items, gap, flex-wrap. Viva: "
        "flex vs grid? Flex = one axis, grid = two.")

def s23_grid():
    s = d.slide(BG)
    head(s, "04 · CSS3", "Grid — structuring the layouts")
    pic_card(s, IMG+"calendar.png", ML, 1.7, w=7.3)
    text(s, ML, 5.62, 7.3, 0.3, "The calendar — a true two-dimensional grid of seven columns.", size=10.5, color=SLATE, italic=True)
    text(s, 8.2, 1.7, 4.4, 0.4, "Two-dimensional layout", size=15, color=TAUPE, bold=True, font=HEAD)
    for i,(t,b) in enumerate([("Rows & columns","the calendar is 7 columns × N weeks"),
                              ("Dashboard cards","auto-fitting stat grid"),
                              ("Notes masonry","cards flow into a responsive grid")]):
        yy=2.3+i*0.82
        icon_chip(s, "grid", 8.2, yy, d=0.42, fill="EDE6E0", icol="taupe", ratio=0.55)
        text(s, 8.75, yy-0.02, 3.9, 0.35, t, size=12.5, color=TEXT, bold=True)
        text(s, 8.75, yy+0.3, 3.9, 0.35, b, size=10.5, color=MUTED)
    code_panel(s, 8.2, 4.95, 4.45, [
        [(".cal-grid",C_FN),(" {",C_DEF)],
        [("  display",C_KEY),(": ",C_DEF),("grid",C_NUM),(";",C_DEF)],
        [("  grid-template-columns",C_KEY),(":",C_DEF)],
        [("    repeat(7, ",C_STR),("minmax",C_FN),("(0,1fr));",C_STR)],
        [("}",C_DEF)],
    ], size=11, title="styles/app.css", header=True)
    text(s, ML, 6.05, 7.3, 0.4, "Used in ~51 rules for every structured, two-dimensional layout.", size=11.5, color=SLATE)
    footer(s, 23)
    s.notes_slide.notes_text_frame.text = ("Grid handles two-dimensional structure (51 rules): the 7-column "
        "calendar, the dashboard's auto-fit stat cards, the notes masonry. Viva: why Grid for the calendar? It's a "
        "genuine rows × columns arrangement.")

def s24_responsive():
    s = d.slide(BG)
    head(s, "04 · CSS3 · Responsive design", "One Synora, every screen")
    BOT=5.9
    def dev(img,x,w,lx,lw,label):
        h=w/aspect(IMG+img); pic_card(s, IMG+img, x, BOT-h, w=w, shcolor=INK, shalpha=26)
        text(s, lx, BOT+0.14, lw, 0.3, label, size=12, color=SAGE_DK, bold=True, align=AL.CENTER)
    dev("dark_resp_desktop.png", ML, 6.15, ML, 6.15, "1440px  ·  Desktop")
    dev("dark_resp_tablet.png", 7.7, 2.35, 7.7, 2.35, "768px  ·  Tablet")
    dev("dark_resp_mobile.png", 10.35, 1.6, 9.95, 2.4, "390px  ·  Mobile")
    rect(s, ML, 6.45, CW, 0.6, fill=SURFACE, radius=0.1, line=MIST, lw=1.2, shadow_=True, shalpha=8)
    rich(s, ML+0.32, 6.45, CW-0.6, 0.6, [("Same landing page  ",13,SAGE_DK,True,BODY),
        ("— Flexbox + Grid reflow, ",12.5,MUTED,False,BODY),("23 media-query blocks",12.5,SAGE_DK,True,MONO),
        (" adapt down, and the nav collapses to a CSS-only menu.",12.5,MUTED,False,BODY)], anchor=AN.MIDDLE)
    s.notes_slide.notes_text_frame.text = ("Mandatory responsive proof — the SAME landing page at 1440/768/390. "
        "The grid hero collapses to one column, buttons go full-width, the navbar becomes a hamburger. Strategy is "
        "desktop-first: 23 media-query blocks adapting DOWN. The menu is pure CSS.")

def s25_respbehav():
    s = d.slide(BG)
    head(s, "04 · CSS3", "How the layout responds")
    cols=[("monitor","Desktop","1440px",SAGE,["Two-column hero","Full navigation bar","Multi-column card grids","Sidebar always visible"]),
          ("smartphone","Tablet","768px",TAUPE,["Hero narrows","Nav collapses to a menu","Grids drop to fewer columns","Comfortable touch targets"]),
          ("smartphone","Mobile","390px",SAGE,["Single-column stack","Hamburger menu (CSS only)","Full-width buttons","Content in reading order"])]
    cw=3.72; gap=(CW-3*cw)/2
    for i,(ic,t,px,col,items) in enumerate(cols):
        x=ML+i*(cw+gap)
        rect(s, x, 1.75, cw, 4.15, fill=SURFACE, line=MIST, lw=1.2, radius=0.08, shadow_=True, shalpha=9)
        icon_chip(s, ic, x+0.3, 2.02, d=0.56, fill=col, icol="white")
        text(s, x+1.0, 2.02, cw-1.1, 0.3, t, size=15, color=TEXT, bold=True, font=HEAD)
        text(s, x+1.0, 2.36, cw-1.1, 0.25, px, size=11, color=SLATE, font=MONO)
        hline(s, x+0.3, 2.8, cw-0.6, color=MIST, weight=1.0)
        for j,it in enumerate(items):
            yy=3.0+j*0.6
            icon_chip(s, "check-circle", x+0.3, yy, d=0.32, fill=SAGE_SOFT, icol="sage", ratio=0.6)
            text(s, x+0.74, yy-0.04, cw-0.9, 0.5, it, size=11, color=MUTED, anchor=AN.MIDDLE, spacing=1.05)
    text(s, ML, 6.15, CW, 0.4, "Media queries + flexible Flexbox/Grid tracks do the work — one HTML page, three experiences.",
         size=12, color=SLATE, italic=True, align=AL.CENTER)
    footer(s, 25)
    s.notes_slide.notes_text_frame.text = ("Concrete responsive behaviour, only what the code does: desktop = two "
        "columns + full nav; tablet = narrower + collapsed menu + fewer grid columns; mobile = single column + "
        "hamburger + full-width buttons. Same HTML, media queries reflow it.")

def s26_theme():
    s = d.slide(BG)
    head(s, "04 · CSS3", "Dark mode & theming")
    _,(_,_,dw,dh)=pic_card(s, IMG+"dashboard_desktop.png", ML, 1.68, w=5.72)
    text(s, ML, 1.68+dh+0.04, 5.72, 0.3, "Light", size=11, color=SLATE, bold=True, align=AL.CENTER)
    pic_card(s, IMG+"dark_dashboard.png", 6.71, 1.68, w=5.72)
    text(s, 6.71, 1.68+dh+0.04, 5.72, 0.3, "Dark", size=11, color=SLATE, bold=True, align=AL.CENTER)
    code_panel(s, ML, 5.72, 6.2, [
        [("var",C_KEY),(" saved = localStorage.",C_DEF),("getItem",C_FN),("(",C_DEF),('"synora-theme"',C_STR),(");",C_DEF)],
        [("root.",C_DEF),("setAttribute",C_FN),("(",C_DEF),('"data-theme"',C_STR),(", theme);",C_DEF),("  // CSS reacts",C_COM)],
    ], size=11, title="scripts/theme.js")
    para(s, 7.05, 5.68, 5.6, 1.3, [
        {'runs':[("Same tokens, two themes.  ",12,TEXT,True,BODY)],'sa':4},
        {'runs':[("data-theme",11.5,SAGE_DK,True,MONO),(" on ",11.5,MUTED,False,BODY),("<html>",11.5,SAGE_DK,True,MONO),
                 (" swaps every token; the choice is saved to localStorage and applied before first paint — no flash.",
                  11.5,MUTED,False,BODY)],'sp':1.22}])
    footer(s, 26)
    s.notes_slide.notes_text_frame.text = ("Theming = one attribute. theme.js reads matchMedia for the system "
        "preference, lets the saved choice win, sets data-theme on <html>, and the CSS custom properties do the "
        "rest. It runs in <head> before first paint so dark-mode users never see a white flash. Persisted in "
        "localStorage.")

def s27_loading():
    s = d.slide(BG)
    head(s, "04 · CSS3 · User experience", "Before Synora appears")
    _,(_,_,ww,hh)=pic_card(s, IMG+"loading.png", ML, 1.95, w=6.15, shcolor=INK, shalpha=26)
    text(s, ML, 1.95+hh+0.1, ww, 0.3, "The Synora splash — logo, ring and wordmark.",
         size=10.5, color=SLATE, italic=True, align=AL.CENTER)
    text(s, 7.5, 1.98, 5.0, 0.3, "THE FLOW", size=10.5, color=TAUPE, bold=True, letter=160)
    for i,(ic,t,b) in enumerate([("zap","Splash","logo, ring & wordmark animate in"),
                                 ("move","Handover","the splash fades and lifts away"),
                                 ("layout","Landing","the hero arrives underneath")]):
        yy=2.35+i*0.74
        icon_chip(s, ic, 7.5, yy, d=0.52, fill=SAGE, icol="white")
        text(s, 8.18, yy-0.02, 4.4, 0.3, t, size=13.5, color=TEXT, bold=True, font=HEAD)
        text(s, 8.18, yy+0.31, 4.4, 0.3, b, size=10.5, color=MUTED)
    hline(s, 7.5, 4.82, 5.1, color=MIST, weight=1.2)
    text(s, 7.5, 5.0, 5.0, 0.3, "HOW IT WORKS", size=10.5, color=TAUPE, bold=True, letter=160)
    for i,(a,b) in enumerate([("CSS @keyframes","pure-CSS animation"),
                              ("JavaScript timing","shows ≥ 2000ms, then loader.remove()"),
                              ("Reduced motion","honoured — 600ms, no animation")]):
        yy=5.36+i*0.44
        rich(s, 7.5, yy, 5.1, 0.35, [(a+"  —  ",11.5,SAGE_DK,True,MONO),(b,11,MUTED,False,BODY)])
    s.notes_slide.notes_text_frame.text = ("The splash is a real UX feature. Three states — splash, handover, "
        "landing. Honest mechanism: the animation is pure CSS @keyframes; JavaScript only controls timing "
        "(shows ≥ 2000ms, then removes the node); prefers-reduced-motion is honoured.")

# =====================================================================
# 05 · JAVASCRIPT (28-36)
# =====================================================================
def s28_js_interactive():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "Making Synora interactive")
    text(s, ML, 1.62, CW, 0.5, "HTML and CSS render the page — JavaScript is what makes it respond. Every click, "
         "keystroke and toggle runs code that updates the screen:", size=13.5, color=MUTED, spacing=1.24)
    flow_line(s, [("move","You act"),("zap","Event fires"),("cpu","JS runs"),("git-branch","DOM updates"),
                  ("eye","You see it")], ML, 2.55, CW, color=SAGE, alt=TAUPE, node_d=0.84, label_size=12.5)
    ex=[("tasks","Tick a task → it completes and the counts drop"),
        ("attendance","Tap +/− → every percentage recomputes live"),
        ("dark_dashboard","Toggle the theme → the whole app repaints")]
    w=3.72; gap=(CW-3*w)/2; x=ML
    for img,cap in ex:
        _,(_,_,ww,hh)=pic_card(s, IMG+img+".png", x, 4.15, w=w)
        text(s, x, 4.15+hh+0.08, ww, 0.5, cap, size=10.5, color=MUTED, align=AL.CENTER, spacing=1.1)
        x+=w+gap
    footer(s, 28)
    s.notes_slide.notes_text_frame.text = ("One clear message: without JS the page is frozen; JavaScript makes it "
        "respond. The loop is always the same — you act, an event fires, a handler runs, the DOM updates, you see "
        "it change. Three concrete examples: completing a task, recomputing attendance, flipping the theme.")

def s29_js_fundamentals():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "Fundamentals, mapped to Synora")
    rows=[("hash","Variables","hold application state","state = { view, sort, query }",SAGE),
          ("tool","Functions","reusable operations","render()  ·  toggleComplete()",TAUPE),
          ("layers","Arrays","lists of things","tasks · subjects · notifications",SAGE),
          ("layout","Objects","structured records","{ id, title, priority, deadline }",TAUPE),
          ("refresh-cw","Loops","render each item",".map() · .filter() · .forEach()",SAGE)]
    y=1.9
    for ic,a,b,c,col in rows:
        rect(s, ML, y, 7.2, 0.78, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=8)
        icon_chip(s, ic, ML+0.16, y+0.16, d=0.46, fill=col, icol="white")
        text(s, ML+0.82, y, 1.7, 0.78, a, size=14, color=TEXT, bold=True, font=HEAD, anchor=AN.MIDDLE)
        text(s, ML+2.5, y, 2.1, 0.78, b, size=11, color=MUTED, anchor=AN.MIDDLE)
        text(s, ML+4.55, y, 2.55, 0.78, c, size=10.5, color=SAGE_DK, font=MONO, anchor=AN.MIDDLE)
        y+=0.9
    rect(s, 8.35, 1.9, 4.3, 4.4, fill=INK, radius=0.06, shadow_=True, shcolor=INK, shalpha=22)
    text(s, 8.65, 2.2, 3.7, 0.4, "ALL FIVE, ONE FUNCTION", size=11, color=TAUPE_LT, bold=True, letter=140)
    code_panel(s, 8.6, 2.65, 3.85, [
        [("function",C_KEY),(" filtered(){",C_DEF)],
        [(" items = all().",C_DEF),("slice",C_FN),("();",C_DEF)],
        [(" items = items.",C_DEF),("filter",C_FN),("(fn)",C_DEF)],
        [("       .",C_DEF),("sort",C_FN),("(byDate);",C_DEF)],
        [(" return",C_KEY),(" items;",C_DEF)],
        [("}",C_DEF)],
    ], size=10.5, title="tasks.js", header=True)
    text(s, 8.65, 5.55, 3.7, 0.7, "Variables, functions, arrays, objects and loops — together in a few lines.",
         size=11, color=MUTED_D, spacing=1.2)
    footer(s, 29)
    s.notes_slide.notes_text_frame.text = ("Each fundamental maps to something concrete: state in variables; render/"
        "toggleComplete functions; tasks/subjects arrays; each task an object; .map/.filter/.forEach loops. Viva: "
        "array vs object? Ordered list vs keyed record.")

def s30_dom():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "The DOM — bridge between JS and UI")
    text(s, ML, 1.62, 5.7, 0.35, "The page is a live tree of nodes:", size=13.5, color=TEXT, bold=True)
    dom=[("main.page","",True,[
            ("section.toolbar","",True,[("input[data-search]","",False)]),
            ("div[data-list]","",True,[("div.trow","one node per task",False)])])]
    rect(s, ML, 2.02, 5.7, 2.35, fill=SURFACE, line=MIST, lw=1.2, radius=0.07, shadow_=True, shalpha=9)
    render_tree(s, ML+0.35, 2.26, "document", dom, size=11.5, lh=1.5, name_gap=3,
                folder_color=SAGE_DK, file_color=MUTED, w=5.2)
    rect(s, ML, 4.62, 5.7, 2.2, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=8)
    text(s, ML+0.3, 4.8, 5.3, 0.3, "SELECTORS ACTUALLY USED", size=10.5, color=TAUPE, bold=True, letter=120)
    scols=[("querySelector()","×161"),("querySelectorAll()","×23"),("getElementById()","×9")]
    for i,(fn,ct) in enumerate(scols):
        yy=5.22+i*0.44
        rich(s, ML+0.3, yy, 5.2, 0.32, [(fn,12.5,SAGE_DK,True,MONO),("   "+ct,11,SLATE,False,BODY)])
    text(s, 6.85, 1.62, 5.8, 0.4, "JavaScript selects, reads and writes", size=14, color=TEXT, bold=True)
    code_panel(s, 6.85, 2.1, 5.82, [
        [("var",C_KEY),(" root = document.",C_DEF),("querySelector",C_FN),("(",C_DEF),('"[data-tasks-page]"',C_STR),(");",C_DEF)],
        [("root.",C_DEF),("querySelectorAll",C_FN),("(",C_DEF),('"[data-view]"',C_STR),(").",C_DEF),("forEach",C_FN),("(…);",C_DEF)],
        [("el.classList.",C_DEF),("toggle",C_FN),("(",C_DEF),('"is-active"',C_STR),(", on);",C_DEF),(" // write CSS",C_COM)],
        [("el.textContent = value;",C_DEF),("            // write text",C_COM)],
    ], size=11.5, title="scripts/tasks.js")
    text(s, 6.85, 4.5, 5.82, 1.9, "Select an element, then read or change its text, its classes (classList toggled "
         "~35×) or its attributes — and the browser repaints instantly. The DOM is the object tree JavaScript "
         "reaches through to change what you see.", size=12.5, color=MUTED, spacing=1.3)
    footer(s, 30)
    s.notes_slide.notes_text_frame.text = ("DOM = the browser's live object tree of the HTML. We select nodes "
        "(querySelector 161×, querySelectorAll 23×, getElementById 9×) and read/write text, classes (35×) and "
        "attributes. Viva: what is the DOM? A tree of objects representing the document that JS changes live.")

def s31_dynamic():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "Building the interface dynamically")
    flow_line(s, [("database","Data"),("cpu","JavaScript"),("code","createElement"),
                  ("git-branch","appendChild"),("layout","Rendered UI")], ML, 1.85, CW,
              color=SAGE, alt=TAUPE, node_d=0.78, label_size=12)
    code_panel(s, ML, 3.3, 6.3, [
        [("var",C_KEY),(" el = document.",C_DEF),("createElement",C_FN),("(",C_DEF),('"div"',C_STR),(");",C_DEF),("  // 1 create",C_COM)],
        [("el.className = ",C_DEF),('"toast"',C_STR),(";",C_DEF)],
        [("el.",C_DEF),("setAttribute",C_FN),("(",C_DEF),('"role"',C_STR),(", ",C_DEF),('"status"',C_STR),(");",C_DEF),(" // 2 config",C_COM)],
        [("region.",C_DEF),("appendChild",C_FN),("(el);",C_DEF),("           // 3 insert",C_COM)],
        [("…  el.",C_DEF),("remove",C_FN),("();",C_DEF),("                   // 4 delete",C_COM)],
    ], size=12, title="scripts/app.js — a node, born and removed")
    text(s, ML, 5.55, 6.3, 0.9, "Every task row is built from data and rendered into the list the same way — "
         "createElement ×18, appendChild ×11, element.remove() ×17.", size=12, color=MUTED, spacing=1.28)
    pic_card(s, IMG+"tasks.png", 7.3, 3.3, w=5.35)
    text(s, 7.3, 3.3+5.35/1.6+0.08, 5.35, 0.3, "Tasks — a list rendered node by node.",
         size=10.5, color=SLATE, italic=True, align=AL.CENTER)
    footer(s, 31)
    s.notes_slide.notes_text_frame.text = ("Dynamic UI: data → JS builds nodes → inserts them → removes when done. "
        "The toast shows the full lifecycle: createElement → configure → appendChild → remove. Task rows render "
        "the same way. Real counts: createElement 18, appendChild 11, remove 17.")

def s32_events():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "Event handling & delegation")
    flow_line(s, [("move","You act"),("zap","Event fires"),("code","addEventListener"),
                  ("cpu","Handler runs"),("git-branch","DOM updates")], ML, 1.72, CW,
              color=SAGE, alt=TAUPE, node_d=0.72, label_size=11.5)
    code_panel(s, ML, 3.15, 6.5, [
        [("// ONE listener handles every task row (delegation)",C_COM)],
        [("container.",C_DEF),("addEventListener",C_FN),("(",C_DEF),('"click"',C_STR),(", ",C_DEF),("function",C_KEY),("(e){",C_DEF)],
        [("  var",C_KEY),(" t = e.target.",C_DEF),("closest",C_FN),("(",C_DEF),('"[data-toggle]"',C_STR),(");",C_DEF)],
        [("  if",C_KEY),(" (t) { toggleComplete(t…); rerender(); }",C_DEF)],
        [("});",C_DEF)],
    ], size=11.5, title="scripts/tasks.js — event delegation")
    facts=[("check-circle","addEventListener","used ~93× across the app"),
           ("check-circle","Event delegation","used — .closest() in ~28 handlers"),
           ("check-circle","Bubbling","used — clicks bubble to the parent list"),
           ("check-circle","preventDefault","used — forms & links (~11)"),
           ("alert-triangle","Explicit capturing","concept only — not a pattern we use")]
    y=2.9
    for ic,a,b in facts:
        ok = ic=="check-circle"
        icon_chip(s, ic, 7.2, y, d=0.4, fill=(SAGE if ok else MIST), icol=("white" if ok else "slate"), ratio=0.52)
        rich(s, 7.72, y, 5.0, 0.4, [(a+"  ",12,TEXT,True,BODY),(b,10.5,MUTED,False,BODY,not ok)], anchor=AN.MIDDLE)
        y+=0.6
    text(s, 7.2, 6.05, 5.4, 0.6, "Rows re-render constantly, so one durable listener on the parent beats binding "
         "one per button.", size=11, color=SLATE, italic=True, spacing=1.2)
    footer(s, 32)
    s.notes_slide.notes_text_frame.text = ("Honesty slide. USED: addEventListener (93×), delegation via closest "
        "(28), bubbling, preventDefault (11). NOT used as a pattern: explicit capturing — say so. Why delegation? "
        "Rows re-render, so one parent listener is more robust than per-button ones. Viva: bubbling vs capturing — "
        "child→parent vs parent→child.")

def s33_validation():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "Forms, validation & interaction")
    pic_card(s, IMG+"login_desktop.png", ML, 1.62, w=6.05)
    text(s, ML, 5.55, 6.05, 0.3, "Sign-in / sign-up validate on submit and clear errors as you type.", size=10.5, color=SLATE, italic=True)
    layers=[("shield","HTML attributes","required, type=email, minlength — the browser's first check"),
            ("check-circle","JavaScript on submit","preventDefault(), trim, regex, friendly inline errors"),
            ("refresh-cw","Live error clearing","the message clears the moment the field is fixed")]
    y=1.66
    for ic,t,b in layers:
        icon_chip(s, ic, 7.05, y, d=0.5, fill=TAUPE, icol="white")
        text(s, 7.7, y, 4.9, 0.35, t, size=13, color=TEXT, bold=True)
        text(s, 7.7, y+0.32, 4.9, 0.5, b, size=10.5, color=MUTED, spacing=1.12)
        y+=0.9
    code_panel(s, 7.05, 4.5, 5.6, [
        [("form.",C_DEF),("addEventListener",C_FN),("(",C_DEF),('"submit"',C_STR),(", ",C_DEF),("function",C_KEY),("(e){",C_DEF)],
        [("  e.",C_DEF),("preventDefault",C_FN),("();",C_DEF),("            // stop native submit",C_COM)],
        [("  if",C_KEY),(" (!EMAIL_RE.",C_DEF),("test",C_FN),("(email))",C_DEF)],
        [("    setError(",C_DEF),('"email"',C_STR),(", ",C_DEF),('"Check your email."',C_STR),(");",C_DEF)],
        [("});",C_DEF)],
    ], size=11, title="scripts/auth.js")
    footer(s, 33)
    s.notes_slide.notes_text_frame.text = ("Validation is layered: HTML attributes first (required/type/minlength), "
        "then JS on submit — preventDefault, trim, regex, friendly inline errors that clear live. Viva: why validate "
        "in JS if HTML does? Custom messages, cross-field checks (password confirm), UX control.")

def s34_storage():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "Data & persistence")
    flow_line(s, [("layout","User data"),("layers","JS objects"),("code","JSON"),("database","localStorage")],
              ML, 1.8, 9.3, color=SAGE, node_d=0.76, label_size=12.5)
    text(s, 10.4, 1.9, 2.2, 0.6, "…restored on every refresh", size=11, color=SLATE, italic=True, anchor=AN.MIDDLE, spacing=1.1)
    code_panel(s, ML, 3.25, 6.4, [
        [("store.",C_DEF),("set",C_FN),("(",C_DEF),('"tasks"',C_STR),(", tasks);",C_DEF)],
        [("  → localStorage.",C_DEF),("setItem",C_FN),("(key, ",C_DEF),("JSON",C_FN),(".",C_DEF),("stringify",C_FN),("(v));",C_DEF)],
        [("",C_DEF)],
        [("store.",C_DEF),("get",C_FN),("(",C_DEF),('"tasks"',C_STR),(")",C_DEF)],
        [("  → JSON",C_FN),(".",C_DEF),("parse",C_FN),("(localStorage.",C_DEF),("getItem",C_FN),("(key));",C_DEF)],
    ], size=11.5, title="scripts/storage.js")
    rect(s, 7.15, 3.25, 5.5, 3.35, fill=SURFACE, line=MIST, lw=1.2, radius=0.08, shadow_=True, shalpha=8)
    text(s, 7.45, 3.48, 5.0, 0.3, "WHAT IS STORED — PER USER", size=10.5, color=TAUPE, bold=True, letter=120)
    keys=["synora-users · synora-session · synora-theme","synora:<user>:subjects  (source of truth)",
          "…:tasks · notes · timetable · attendance","…:cgpa · achievements · notifications · profile"]
    for i,k in enumerate(keys):
        text(s, 7.45, 3.86+i*0.4, 5.0, 0.35, k, size=10.5, color=SAGE_DK, font=MONO)
    text(s, 7.45, 5.6, 5.0, 0.85, "Every account gets its own namespaced workspace. Limitation: data is "
         "per-browser, not synced across devices.", size=11, color=MUTED, spacing=1.2)
    footer(s, 34)
    s.notes_slide.notes_text_frame.text = ("Persistence: JS objects are serialised with JSON.stringify into "
        "localStorage and read back with JSON.parse (3 each). Global keys (users/session/theme) plus per-user "
        "namespaced keys so accounts don't collide. Limitation: per-device only, no server sync.")

def s35_engineering():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "The logic we coded")
    text(s, ML, 1.62, CW, 0.4, "The academic numbers aren't stored — JavaScript computes them live from your "
         "subjects. The real formulas behind the screens:", size=13, color=MUTED)
    cards=[("percent","Attendance %","attended / held × 100","how much of each subject you've attended",SAGE),
           ("trending-up","CGPA","Σ(credits × grade point) / Σ(credits)","weighted by each subject's credits",TAUPE),
           ("check-circle","Classes you can safely miss","floor(attended × 100 / target) − held","when you're already above target",SAGE),
           ("alert-triangle","Classes to attend in a row","ceil((target × held − 100 × attended) / (100 − target))","to climb back above target",TAUPE)]
    cw=5.86; gap=CW-2*cw; y0=2.05; ch=1.85; rowstep=ch+0.17
    for i,(ic,t,f,m,col) in enumerate(cards):
        c=i%2; r=i//2; x=ML+c*(cw+gap); y=y0+r*rowstep
        rect(s, x, y, cw, ch, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=9)
        icon_chip(s, ic, x+0.28, y+0.24, d=0.5, fill=col, icol="white")
        text(s, x+0.92, y+0.22, cw-1.15, 0.5, t, size=13, color=TEXT, bold=True, font=HEAD, anchor=AN.MIDDLE)
        rect(s, x+0.28, y+0.82, cw-0.56, 0.56, fill=CODEBG, radius=0.06)
        text(s, x+0.4, y+0.82, cw-0.8, 0.56, f, size=12.5, color=C_KEY, font=MONO, align=AL.CENTER, anchor=AN.MIDDLE)
        text(s, x+0.28, y+1.46, cw-0.56, 0.35, m, size=10.5, color=MUTED)
    yb=y0+2*rowstep
    rect(s, ML, yb, CW, 0.72, fill=INK, radius=0.1, shadow_=True, shcolor=INK, shalpha=22)
    rich(s, ML+0.32, yb, CW-0.6, 0.72, [("Subjects are the source of truth  —  ",13,TAUPE_LT,True,HEAD),
        ("attendance, CGPA, timetable and tasks all reference a subject by id, in each user's own workspace.",
         12.5,CREAM,False,BODY)], anchor=AN.MIDDLE)
    footer(s, 35)
    s.notes_slide.notes_text_frame.text = ("The engineering pay-off, shown as the actual formulas we coded. "
        "Attendance % = attended/held×100. CGPA = Σ(credits×gradePoint)/Σ(credits), fails score 0 but keep their "
        "credits. 'Can miss' and 'catch up' are derived from the target inequality. Nothing is stored — it's all "
        "computed live from the subject list, per user.")

def s36_bom():
    s = d.slide(BG)
    head(s, "05 · JavaScript", "The browser environment (BOM)")
    text(s, ML, 1.62, CW, 0.5, "JavaScript talks not only to the DOM, but to the browser itself — only the APIs "
         "Synora actually uses:", size=13.5, color=MUTED, spacing=1.2)
    apis=[("database","localStorage","per-user persistence","×16"),
          ("eye","matchMedia","system theme & reduced motion","×2"),
          ("clock","setTimeout","loader timing, toasts","×7"),
          ("refresh-cw","requestAnimationFrame","smooth UI updates","×2"),
          ("arrow-right","location","navigation between pages","×8"),
          ("code","window / document","the global entry points","core")]
    cw=3.72; gap=(CW-3*cw)/2
    for i,(ic,t,b,ct) in enumerate(apis):
        col=i%3; row=i//3
        x=ML+col*(cw+gap); y=2.35+row*1.85
        rect(s, x, y, cw, 1.6, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=8)
        icon_chip(s, ic, x+0.28, y+0.28, d=0.56, fill=(SAGE if (i%2==0) else TAUPE), icol="white")
        text(s, x+1.0, y+0.28, cw-1.55, 0.56, t, size=11.5, color=TEXT, bold=True, font=MONO, anchor=AN.MIDDLE)
        text(s, x+cw-0.7, y+0.34, 0.55, 0.3, ct, size=10.5, color=SLATE, align=AL.RIGHT, font=MONO)
        text(s, x+0.28, y+0.95, cw-0.5, 0.5, b, size=11, color=MUTED, spacing=1.1)
    footer(s, 36)
    s.notes_slide.notes_text_frame.text = ("BOM = browser object model. Honest list of what's used: localStorage "
        "(16), matchMedia (2, theme + reduced motion), setTimeout (7), requestAnimationFrame (2), location (8), and "
        "window/document. No navigator, no resize handlers, no setInterval.")

# =====================================================================
# FINAL SECTION (37-41)
# =====================================================================
def s37_oneview():
    s = d.slide(INK, textured=True)
    eyebrow(s, ML, 0.55, "The product", color=TAUPE_LT)
    text(s, ML, 0.85, CW, 0.6, "Synora in one view", size=28, color=CREAM, bold=True, font=HEAD)
    # collage: big dashboard left + 2x2 grid of core screens right
    pic_card(s, IMG+"landing_desktop.png", ML, 1.85, w=7.4, shcolor="000000", shalpha=40)
    text(s, ML, 6.5, 7.4, 0.3, "Landing", size=10.5, color=MUTED_D, italic=True, align=AL.CENTER)
    grid=[("tasks","Tasks"),("timetable","Timetable"),("attendance","Attendance"),("cgpa","CGPA")]
    sx=8.35; sw=2.06; sgap=0.16
    for i,(img,lab) in enumerate(grid):
        col=i%2; row=i//2
        x=sx+col*(sw+sgap); y=1.85+row*2.35
        _,(_,_,ww,hh)=pic_card(s, IMG+img+".png", x, y, w=sw, shcolor="000000", shalpha=34)
        text(s, x, y+hh+0.05, ww, 0.25, lab, size=9.5, color=MUTED_D, italic=True, align=AL.CENTER)
    footer(s, 37, dark=True)
    s.notes_slide.notes_text_frame.text = ("A polished showcase — the dashboard plus the core academic screens. "
        "This is the visual proof that Synora is a complete, working product, not a demo of isolated concepts.")

def s38_beyond():
    s = d.slide(BG)
    head(s, "Summary", "What we built beyond the syllabus")
    rect(s, ML, 1.75, 3.15, 4.5, fill=INK, radius=0.06, shadow_=True, shcolor=INK, shalpha=22)
    text(s, ML, 2.02, 3.15, 0.4, "SYLLABUS", size=12, color=TAUPE_LT, bold=True, align=AL.CENTER, letter=160)
    for i,l in enumerate(["HTML5","CSS3","JavaScript","DOM","Events"]):
        text(s, ML, 2.5+i*0.5, 3.15, 0.4, l, size=14, color=CREAM, bold=True, align=AL.CENTER)
    chevron_right(s, 4.05, 4.0, size=0.4, color=TAUPE)
    adds=[("lock","Authentication"),("sliders","Personalized onboarding"),("user","Avatar system"),
          ("check-square","Task management"),("calendar","Calendar"),("feather","Quick Notes"),
          ("grid","Timetable"),("percent","Attendance logic"),("trending-up","CGPA logic"),
          ("award","Achievements"),("bell","Notifications"),("eye","Light / dark mode")]
    gx=4.85; cw=3.72; gap=(d.W-MR-gx-2*cw)/2
    for i,(ic,t) in enumerate(adds):
        col=i%2; row=i//2
        x=gx+col*(cw+gap); y=1.78+row*0.75
        rect(s, x, y, cw, 0.64, fill=SURFACE, line=MIST, lw=1.1, radius=0.1, shadow_=True, shalpha=6)
        icon_chip(s, ic, x+0.12, y+0.12, d=0.4, fill=SAGE_SOFT, icol="sage", ratio=0.56)
        text(s, x+0.64, y, cw-0.7, 0.64, t, size=11.5, color=TEXT, bold=True, anchor=AN.MIDDLE)
    footer(s, 36)
    s.notes_slide.notes_text_frame.text = ("The pay-off slide. The syllabus gave five building blocks; on top we "
        "engineered authentication, personalized onboarding, an avatar system, task/calendar/notes, timetable, "
        "attendance and CGPA logic, achievements, notifications, theming, and a per-user data architecture.")

def s39_why():
    s = d.slide(BG)
    head(s, "Summary", "Why Synora?")
    adv=[("layers","Unified","One workspace for the whole semester"),
         ("user","Personalized","Every student gets their own environment"),
         ("check-circle","Student-centric","Designed around real student workflows"),
         ("smartphone","Responsive","Works across desktop, tablet and mobile"),
         ("zap","Lightweight","Built on core web tech — no heavy frameworks"),
         ("trending-up","Extensible","Ready to grow into a larger platform")]
    cw=3.72; gap=(CW-3*cw)/2
    for i,(ic,t,b) in enumerate(adv):
        col=i%3; row=i//2 if False else i//3
        x=ML+col*(cw+gap); y=1.95+row*2.2
        rect(s, x, y, cw, 1.95, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=9)
        icon_chip(s, ic, x+0.3, y+0.3, d=0.6, fill=(SAGE if i%2==0 else TAUPE), icol="white")
        text(s, x+0.3, y+1.05, cw-0.6, 0.4, t, size=15, color=TEXT, bold=True, font=HEAD)
        text(s, x+0.3, y+1.45, cw-0.6, 0.5, b, size=11, color=MUTED, spacing=1.12)
    footer(s, 39)
    s.notes_slide.notes_text_frame.text = ("Six advantages: unified, personalized, student-centric, responsive, "
        "lightweight, extensible. Each is grounded in a real property of the build.")

def s40_future():
    s = d.slide(BG)
    head(s, "What's next", "Where Synora goes next")
    steps=[("server","Backend","Secure server-side persistence"),
           ("database","Database","Reliable structured storage"),
           ("cloud","Cloud sync","One workspace across devices"),
           ("shield","Secure auth","Production-grade authentication"),
           ("calendar","Calendar sync","Google Calendar / Outlook"),
           ("cpu","AI study assistant","Planning & revision scheduling"),
           ("bar-chart-2","Analytics","Productivity, attendance, workload"),
           ("smartphone","Mobile app","A native companion")]
    cw=2.86; gap=(CW-4*cw)/3
    for i,(ic,t,b) in enumerate(steps):
        col=i%4; row=i//4
        x=ML+col*(cw+gap); y=2.0+row*2.35
        rect(s, x, y, cw, 2.05, fill=SURFACE, line=MIST, lw=1.2, radius=0.09, shadow_=True, shalpha=9)
        icon_chip(s, ic, x+0.28, y+0.28, d=0.58, fill=(SAGE if i%2==0 else TAUPE), icol="white")
        text(s, x+0.28, y+1.02, cw-0.56, 0.4, t, size=13.5, color=TEXT, bold=True, font=HEAD)
        text(s, x+0.28, y+1.42, cw-0.56, 0.5, b, size=10.5, color=MUTED, spacing=1.12)
    footer(s, 40)
    s.notes_slide.notes_text_frame.text = ("Roadmap, honestly framed as future work: a backend + database for "
        "real persistence, cloud sync, production auth, external calendar integration, an AI study assistant, "
        "analytics, and a mobile app.")

def s41_thanks():
    s = d.slide(INK, textured=True)
    # THANK YOU — the hero of the closing slide
    picw(s, LOGO+"logo-mark-dark.png", ML, 0.62, 0.85)
    text(s, ML+1.0, 0.68, 5, 0.6, "Synora", size=22, color=CREAM, bold=True, font=HEAD, anchor=AN.MIDDLE)
    text(s, ML-0.05, 1.78, 8.6, 1.9, "Thank\nyou.", size=104, color=CREAM, bold=True, font=HEAD, spacing=0.92)
    text(s, ML+0.05, 5.35, 8.6, 0.5, "Synora — one calm home for everything you're studying.",
         size=16, color=SAGE_LT, italic=True)
    text(s, ML+0.05, 6.05, 6, 0.3, "SUBMITTED BY", size=10, color=TAUPE_LT, bold=True, letter=200)
    text(s, ML+0.05, 6.38, 8, 0.4, NAMES, size=14.5, color=CREAM, bold=True)
    # QR to the live demo
    qx, qw = 9.55, 2.55
    rect(s, qx, 2.35, qw, qw, fill="FFFFFF", radius=0.08, shadow_=True, shcolor="000000", shalpha=34)
    picw(s, IMG+"qr.png", qx+0.28, 2.63, qw-0.56)
    text(s, qx-0.3, 2.35+qw+0.18, qw+0.6, 0.3, "Scan for the live demo", size=12.5, color=CREAM, bold=True, align=AL.CENTER)
    text(s, qx-0.3, 2.35+qw+0.5, qw+0.6, 0.3, "synora.vercel.app", size=11, color=SAGE_LT, align=AL.CENTER, font=MONO)
    s.notes_slide.notes_text_frame.text = ("Close big — 'Thank you' is the hero. Restate the thesis: we used the "
        "web-development syllabus as the foundation and built Synora into a complete, responsive, personalized "
        "student-productivity platform. The QR links to the live deployment (sample URL — replace before final).")

order=[s01_title,s02_idea,s03_solution,s04_what,s06_stack,
       s08_arch,s09_dataflow,s10_html_structure,s11_journey,s12_landing,s13_account,s14_personalize,
       s15_prod,s16_acad,s17_progress,s18_forms,s20_designsystem,s_tokens,s21_boxmodel,
       s22_flex,s23_grid,s24_responsive,s26_theme,s27_loading,s28_js_interactive,
       s29_js_fundamentals,s30_dom,s31_dynamic,s32_events,s33_validation,s34_storage,s35_engineering,
       s38_beyond,s37_oneview,s41_thanks]
for fn in order:
    fn()
d.save(OUT)
print("saved", OUT, "slides:", len(d.prs.slides._sldIdLst))
