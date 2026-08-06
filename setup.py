from setuptools import setup, find_packages

setup(
    name='qrferry',
    version='0.1.0',
    description='Offline optical file transfer tool using animated QR codes (RaptorQ/Fountain codes).',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    author='QRFerry',
    packages=find_packages(),
    install_requires=[
        'qrcode[pil]',
        'opencv-python',
        'pyzbar',
        'pyraptorq',
        'tqdm',
        'flask'
    ],
    entry_points={
        'console_scripts': [
            'qrferry = qrferry.cli:main',
        ],
    },
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.9',
)
