pip install -r requirements.txt
pip uninstall -y opencv-python opencv-contrib-python || true
pip install --force-reinstall opencv-python-headless==4.13.0.92
