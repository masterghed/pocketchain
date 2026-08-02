import re

# 1. Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

google_btn_html = '''        <!-- Google Login Button -->
        <button type="button" class="btn-google" onclick="handleGoogleLogin()">
            <i class="fab fa-google"></i> Connect with Google
        </button>'''

# Hanapin ang password wrapper at isingit ang Google button sa ilalim nito
if 'btn-google' not in html:
    pattern = r'(<div class="password-wrapper">.*?</div>\s*</div>)'
    updated_html = re.sub(pattern, r'\1\n\n' + google_btn_html, html, flags=re.DOTALL)
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(updated_html)
    print("✅ Successfully updated index.html!")
else:
    print("ℹ️ Google button is already in index.html")

# 2. Update style.css
with open('style.css', 'r', encoding='utf-8') as f:
    css = f.read()

google_btn_css = '''
/* Google Button Style */
.btn-google {
    width: 100%;
    padding: 12px;
    margin-top: 15px;
    margin-bottom: 15px;
    background-color: #ffffff;
    color: #333333;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-google:hover {
    background-color: #f1f1f1;
}

.btn-google:active {
    transform: scale(0.98);
}

.btn-google i {
    color: #4285F4;
    font-size: 1.1rem;
}
'''

if '.btn-google' not in css:
    with open('style.css', 'a', encoding='utf-8') as f:
        f.write(google_btn_css)
    print("✅ Successfully updated style.css!")
else:
    print("ℹ️ Google button styles already exist in style.css")

