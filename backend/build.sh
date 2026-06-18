sudo apt-get update -y && sudo apt-get install -y libgles2 libgl1 libegl1 libglib2.0-0 || true
pip install -r requirements.txt
pip uninstall -y opencv-python opencv-contrib-python || true
pip install --force-reinstall opencv-python-headless==4.13.0.92
