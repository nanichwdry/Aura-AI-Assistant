# Aura UI Components - Visual Reference

## Complete Component Hierarchy

```
<App>
  │
  ├─ <TopBar> (fixed, z-50, 64px height)
  │   ├─ Left Section
  │   │   ├─ Logo (32px indigo square, rounded-xl)
  │   │   └─ "Aura" text (font-semibold, text-lg)
  │   │
  │   └─ Right Section (flex gap-2)
  │       ├─ MicButton (active: indigo-600 bg)
  │       ├─ ThemeButton (Sun/Moon icon)
  │       ├─ SoundButton (Volume/VolumeX icon)
  │       └─ SettingsButton
  │
  ├─ <MainContent> (flex, pt-16)
  │   │
  │   ├─ <ChatPanel> (flex-1, flex-col)
  │   │   │
  │   │   ├─ <MessagesArea> (flex-1, overflow-y-auto, p-6)
  │   │   │   │
  │   │   │   ├─ IF messages.length === 0:
  │   │   │   │   └─ <EmptyState>
  │   │   │   │       ├─ Logo (64px indigo square)
  │   │   │   │       ├─ "Hi, I'm Aura" (text-2xl)
  │   │   │   │       └─ "Your personal AI assistant"
  │   │   │   │
  │   │   │   └─ ELSE:
  │   │   │       └─ messages.map(msg =>
  │   │   │           <MessageBubble>
  │   │   │             IF user: right-aligned, indigo-600 bg
  │   │   │             IF assistant: left-aligned, card bg
  │   │   │           </MessageBubble>
  │   │   │         )
  │   │   │
  │   │   └─ <InputBar> (p-4, border-t)
  │   │       └─ <InputContainer> (rounded-2xl, border)
  │   │           ├─ AttachButton (Paperclip icon)
  │   │           ├─ TextInput (flex-1)
  │   │           └─ SendButton (indigo-600 bg)
  │   │
  │   └─ <Sidebar> (w-80, border-l, hidden lg:block)
  │       └─ <QuickActions> (p-6)
  │           ├─ Title: "Quick Actions"
  │           └─ Grid (2 columns, gap-2)
  │               └─ 17 × <ActionButton>
  │                   onClick → setActiveDrawer(action)
  │
  ├─ <MobileMenuButton> (lg:hidden, fixed bottom-right)
  │   └─ Menu icon, indigo-600 bg, rounded-full
  │
  ├─ IF isSidebarOpen (mobile):
  │   └─ <MobileSidebarDrawer>
  │       ├─ Backdrop (bg-black/50)
  │       └─ Drawer (w-80, slide from right)
  │           ├─ Header (title + close button)
  │           └─ Quick Actions grid
  │
  ├─ IF activeDrawer:
  │   └─ <ToolDrawer>
  │       ├─ Backdrop (bg-black/50)
  │       └─ Panel (rounded-2xl, max-h-80vh)
  │           ├─ Header (tool name + close button)
  │           └─ Content (tool interface)
  │
  └─ IF isSettingsOpen:
      └─ <SettingsModal>
          └─ (existing Settings/DesktopSettings component)
```

---

## Component Specifications

### 1. TopBar
```tsx
<div className="fixed top-0 left-0 right-0 h-16 bg-[#25252b] border-b border-gray-800 flex items-center justify-between px-6 z-50">
  {/* Left */}
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
      A
    </div>
    <span className="font-semibold text-lg">Aura</span>
  </div>
  
  {/* Right */}
  <div className="flex items-center gap-2">
    <button className="p-2.5 rounded-xl">
      <Mic className="w-5 h-5" />
    </button>
    {/* ... other buttons */}
  </div>
</div>
```

**Dimensions:**
- Height: 64px (h-16)
- Padding: 24px horizontal (px-6)
- Logo: 32px square (w-8 h-8)
- Buttons: 40px (p-2.5 + icon 20px)
- Gap: 8px (gap-2)

---

### 2. Empty State
```tsx
<div className="h-full flex flex-col items-center justify-center">
  <div className="w-16 h-16 bg-indigo-600 rounded-2xl mb-4 flex items-center justify-center">
    <span className="text-2xl text-white font-bold">A</span>
  </div>
  <h2 className="text-2xl font-semibold mb-2">Hi, I'm Aura</h2>
  <p className="text-gray-400">Your personal AI assistant. How can I help?</p>
</div>
```

**Dimensions:**
- Logo: 64px square (w-16 h-16)
- Title: 24px (text-2xl)
- Subtitle: 14px (text-base)
- Spacing: 16px between elements

---

### 3. Message Bubble (User)
```tsx
<div className="flex justify-end">
  <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-indigo-600 text-white">
    <p className="text-sm leading-relaxed">{content}</p>
  </div>
</div>
```

**Dimensions:**
- Max width: 70% of container
- Border radius: 16px (rounded-2xl)
- Padding: 16px horizontal, 12px vertical
- Font size: 14px (text-sm)
- Line height: 1.625 (leading-relaxed)

---

### 4. Message Bubble (Assistant)
```tsx
<div className="flex justify-start">
  <div className="max-w-[70%] rounded-2xl px-4 py-3 bg-[#25252b] border border-gray-800">
    <p className="text-sm leading-relaxed">{content}</p>
  </div>
</div>
```

**Dimensions:**
- Same as user bubble
- Background: card color (#25252b)
- Border: 1px gray-800

---

### 5. Input Bar
```tsx
<div className="p-4 border-t border-gray-800">
  <div className="flex items-center gap-2 bg-[#25252b] rounded-2xl px-4 py-2 border border-gray-800">
    <button className="p-2 hover:bg-gray-700/10 rounded-lg">
      <Paperclip className="w-5 h-5" />
    </button>
    <input
      type="text"
      placeholder="Type a message..."
      className="flex-1 bg-transparent outline-none"
    />
    <button className="p-2 bg-indigo-600 text-white rounded-lg">
      <Send className="w-5 h-5" />
    </button>
  </div>
</div>
```

**Dimensions:**
- Container padding: 16px (p-4)
- Input container: rounded-2xl (16px)
- Button size: 36px (p-2 + icon 20px)
- Gap: 8px (gap-2)

---

### 6. Quick Action Button
```tsx
<button
  onClick={() => setActiveDrawer(action)}
  className="p-3 rounded-xl border border-gray-800 hover:border-indigo-600 transition-all text-sm text-left"
>
  {action}
</button>
```

**Dimensions:**
- Padding: 12px (p-3)
- Border radius: 12px (rounded-xl)
- Font size: 14px (text-sm)
- Transition: 200ms all

**Grid:**
- 2 columns
- Gap: 8px (gap-2)
- Each button: ~140px wide (auto)

---

### 7. Tool Drawer (Desktop)
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div onClick={close} className="absolute inset-0 bg-black/50" />
  <div className="relative bg-[#25252b] rounded-2xl w-[600px] max-h-[80vh] overflow-y-auto p-6">
    <div className="flex justify-between items-center mb-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      <button onClick={close}>
        <X className="w-5 h-5" />
      </button>
    </div>
    {/* Content */}
  </div>
</div>
```

**Dimensions:**
- Width: 600px
- Max height: 80vh
- Padding: 24px (p-6)
- Border radius: 16px (rounded-2xl)
- Backdrop: 50% black opacity

---

### 8. Tool Drawer (Mobile)
```tsx
<div className="fixed inset-0 z-50 flex items-end">
  <div onClick={close} className="absolute inset-0 bg-black/50" />
  <div className="relative bg-[#25252b] rounded-t-3xl w-full max-h-[80vh] overflow-y-auto p-6">
    {/* Same content as desktop */}
  </div>
</div>
```

**Dimensions:**
- Width: 100%
- Max height: 80vh
- Border radius: 24px top only (rounded-t-3xl)
- Slides up from bottom

---

### 9. Sidebar
```tsx
<div className="w-80 border-l border-gray-800 bg-[#25252b] overflow-y-auto hidden lg:block">
  <div className="p-6">
    <h3 className="font-semibold mb-4">Quick Actions</h3>
    <div className="grid grid-cols-2 gap-2">
      {/* Action buttons */}
    </div>
  </div>
</div>
```

**Dimensions:**
- Width: 320px (w-80)
- Padding: 24px (p-6)
- Title margin: 16px bottom (mb-4)
- Hidden on mobile (hidden lg:block)

---

### 10. Mobile Menu Button
```tsx
<button className="lg:hidden fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg z-40">
  <Menu className="w-6 h-6" />
</button>
```

**Dimensions:**
- Size: 56px (p-4 + icon 24px)
- Position: 24px from bottom-right
- Border radius: 50% (rounded-full)
- Shadow: large (shadow-lg)

---

## Spacing System

### Padding Scale
- `p-2` = 8px (small buttons)
- `p-3` = 12px (action buttons)
- `p-4` = 16px (input bar, large buttons)
- `p-6` = 24px (panels, sections)
- `p-8` = 32px (large sections)

### Gap Scale
- `gap-2` = 8px (buttons, grid)
- `gap-3` = 12px (logo + text)
- `gap-4` = 16px (sections)

### Margin Scale
- `mb-2` = 8px (small spacing)
- `mb-4` = 16px (section spacing)
- `mb-6` = 24px (large spacing)

---

## Border Radius Scale

- `rounded-lg` = 8px (small elements)
- `rounded-xl` = 12px (buttons, cards)
- `rounded-2xl` = 16px (panels, bubbles)
- `rounded-3xl` = 24px (mobile drawers)
- `rounded-full` = 50% (circular buttons)

---

## Z-Index Layers

- `z-40` = Mobile menu button
- `z-50` = Top bar, drawers, modals
- Base layer = Chat content

---

## Responsive Breakpoints

### Desktop (≥1024px)
- Sidebar visible
- Tool drawers centered
- Full layout

### Mobile (<1024px)
- Sidebar hidden
- Mobile menu button visible
- Tool drawers slide from bottom
- Full-width chat

---

## Color Reference

### Dark Theme
```css
--bg-primary: #1a1a1f
--bg-card: #25252b
--border: #374151 (gray-800)
--text-primary: #f3f4f6 (gray-100)
--text-muted: #9ca3af (gray-400)
--accent: #6366f1 (indigo-600)
--accent-hover: #4f46e5 (indigo-700)
```

### Light Theme
```css
--bg-primary: #f9fafb (gray-50)
--bg-card: #ffffff
--border: #e5e7eb (gray-200)
--text-primary: #111827 (gray-900)
--text-muted: #4b5563 (gray-600)
--accent: #6366f1 (indigo-600)
--accent-hover: #4f46e5 (indigo-700)
```

---

## Icon Sizes

- Small: 16px (w-4 h-4)
- Medium: 20px (w-5 h-5) ← Most common
- Large: 24px (w-6 h-6)
- XL: 32px (w-8 h-8)

---

## Animation Timing

- Fast: 150ms (hover states)
- Normal: 200ms (transitions)
- Slow: 250ms (drawers, modals)
- Easing: cubic-bezier(0.4, 0, 0.2, 1)

---

This visual reference provides exact dimensions, spacing, and styling for every component in the redesigned Aura UI.
