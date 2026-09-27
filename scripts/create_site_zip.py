import os
import shutil
import zipfile
import sys

def build_zip(target_zip_path):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(current_dir, '..'))
    if not os.path.exists(os.path.join(root_dir, 'package.json')):
        root_dir = os.getcwd()

    readme_source = os.path.join(root_dir, 'PORTFOLIO_README.md')
    site_dirs = ['app', 'components', 'lib', 'public', 'src']
    site_files = [
        'package.json',
        'tsconfig.json',
        'next.config.ts',
        'next-env.d.ts',
        'postcss.config.mjs',
        'eslint.config.mjs',
        'bun.lock',
        '.env.example',
        '.gitignore',
    ]

    temp_zip = target_zip_path + '.tmp'
    if os.path.exists(temp_zip):
        try:
            os.remove(temp_zip)
        except Exception:
            pass

    os.makedirs(os.path.dirname(os.path.abspath(target_zip_path)), exist_ok=True)

    with zipfile.ZipFile(temp_zip, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=5) as zipf:
        for f in sorted(site_files):
            p = os.path.join(root_dir, f)
            if os.path.exists(p):
                zipf.write(p, f)

        if os.path.exists(readme_source):
            zipf.write(readme_source, 'README.md')

        for d in sorted(site_dirs):
            full_d = os.path.join(root_dir, d)
            if not os.path.exists(full_d):
                continue
            for folder, dirs, files in sorted(os.walk(full_d)):
                files = [
                    f for f in files 
                    if not f.startswith('.DS_Store') 
                    and not f.endswith('.pyc') 
                    and not f.endswith('.zip')
                    and not f.endswith('.tmp')
                ]
                for file in sorted(files):
                    # Do not package api/download into the downloadable zip to keep it pristine
                    rel_to_app = os.path.relpath(folder, os.path.join(root_dir, 'app'))
                    if rel_to_app == 'api' or rel_to_app.startswith('api' + os.sep):
                        continue

                    filepath = os.path.join(folder, file)
                    arcname = os.path.relpath(filepath, root_dir)
                    zipf.write(filepath, arcname)

    os.replace(temp_zip, target_zip_path)
    print(f'Archive successfully built at {target_zip_path}')

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else '/tmp/portfolio-website.zip'
    build_zip(target)
