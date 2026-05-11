import os
from fpdf import FPDF
from pathlib import Path
from datetime import datetime

class CodePDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 8)
        self.set_text_color(128)
        self.cell(0, 10, f'Nextflow Pro Technical Documentation - Generated on {datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 0, 'R')
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.set_text_color(128)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def create_pdf_from_files(output_path, files_list, title):
    pdf = CodePDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Cover Page
    pdf.add_page()
    pdf.set_font('helvetica', 'B', 24)
    pdf.ln(60)
    pdf.cell(0, 20, title, 0, 1, 'C')
    pdf.set_font('helvetica', '', 14)
    pdf.cell(0, 10, 'Technical Source Code Documentation', 0, 1, 'C')
    pdf.ln(20)
    pdf.set_font('helvetica', 'I', 10)
    pdf.cell(0, 10, f'Generated at: {datetime.now().strftime("%Y-%m-%d %H:%M")}', 0, 1, 'C')
    
    for file_path in files_list:
        relative_path = os.path.relpath(file_path, start=r'D:\projek_bot\claude')
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            pdf.add_page()
            # File Header
            pdf.set_font('helvetica', 'B', 12)
            pdf.set_fill_color(240, 240, 240)
            pdf.cell(0, 10, f' FILE: {relative_path}', 0, 1, 'L', fill=True)
            pdf.ln(5)
            
            # File Content
            pdf.set_font('courier', '', 8)
            # Use multi_cell to handle wrapping and newlines
            # We replace tabs with spaces for better formatting
            content = content.replace('\t', '    ')
            # Sanitize content for standard fpdf fonts (latin-1)
            sanitized_content = content.encode('latin-1', 'replace').decode('latin-1')
            pdf.multi_cell(0, 4, sanitized_content)
            
        except Exception as e:
            print(f"Error processing {file_path}: {str(e).encode('ascii', 'ignore').decode('ascii')}")
            
    pdf.output(output_path)
    print(f"Successfully generated: {output_path}")

def main():
    base_dir = r'D:\projek_bot\claude'
    output_dir = os.path.join(base_dir, 'claude pdf')
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Folder SRC (1 PDF)
    src_files = []
    for root, dirs, files in os.walk(os.path.join(base_dir, 'src')):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css', '.html')):
                src_files.append(os.path.join(root, file))
    src_files.sort()
    create_pdf_from_files(os.path.join(output_dir, '1_Folder_SRC.pdf'), src_files, 'Source Code: src/ Folder')
    
    # 2. bridge.py (1 PDF)
    create_pdf_from_files(os.path.join(output_dir, '2_bridge_py.pdf'), [os.path.join(base_dir, 'bridge.py')], 'Source Code: bridge.py')
    
    # 3. controller.py (1 PDF)
    create_pdf_from_files(os.path.join(output_dir, '3_controller_py.pdf'), [os.path.join(base_dir, 'controller.py')], 'Source Code: controller.py')
    
    # 4. main.py (1 PDF)
    create_pdf_from_files(os.path.join(output_dir, '4_main_py.pdf'), [os.path.join(base_dir, 'main.py')], 'Source Code: main.py')
    
    # 5. vite.config.ts (1 PDF)
    create_pdf_from_files(os.path.join(output_dir, '5_vite_config_ts.pdf'), [os.path.join(base_dir, 'vite.config.ts')], 'Source Code: vite.config.ts')
    
    # 6. Folder CORE (1 PDF)
    core_files = []
    for root, dirs, files in os.walk(os.path.join(base_dir, 'core')):
        for file in files:
            if file.endswith('.py'):
                core_files.append(os.path.join(root, file))
    core_files.sort()
    create_pdf_from_files(os.path.join(output_dir, '6_Folder_CORE.pdf'), core_files, 'Source Code: core/ Folder')
    
    # 7. dist/index.html (1 PDF)
    dist_html = os.path.join(base_dir, 'dist', 'index.html')
    if os.path.exists(dist_html):
        create_pdf_from_files(os.path.join(output_dir, '7_dist_index_html.pdf'), [dist_html], 'Source Code: dist/index.html')
    else:
        print("Warning: dist/index.html not found.")

if __name__ == "__main__":
    main()
