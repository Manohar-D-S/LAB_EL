#!/usr/bin/env python3
"""
🚀 DASHBOARD Quick Start
Get your ambulance detection dashboard running quickly
"""

import os
import sys
from pathlib import Path

def main():
    """Quick start guide for dashboard setup"""
    print("🚑 AMBULANCE DETECTION DASHBOARD")
    print("=" * 50)
    
    # Check current directory
    dashboard_dir = Path.cwd()
    print(f"📁 Dashboard directory: {dashboard_dir}")
    
    # Check essential files
    required_files = [
        "models/ambulance_model.pt",
        "detection/ambulance_detector.py",
        "backend/main.py",
        "config/data.yaml",
        "requirements.txt"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not (dashboard_dir / file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing required files:")
        for file in missing_files:
            print(f"   - {file}")
        return False
    
    print("✅ All required files found!")
    
    # Installation guide
    print(f"\n🔧 SETUP INSTRUCTIONS:")
    print(f"1. Install dependencies:")
    print(f"   pip install -r requirements.txt")
    print(f"")
    print(f"2. Test the detector:")
    print(f"   python detection/ambulance_detector.py")
    print(f"")
    print(f"3. Start the API server:")
    print(f"   cd backend")
    print(f"   python main.py")
    print(f"")
    print(f"4. API will be available at:")
    print(f"   http://localhost:8000")
    print(f"   Docs: http://localhost:8000/docs")
    
    # Quick test option
    print(f"\n🧪 QUICK TEST:")
    choice = input("Would you like to test the detector now? (y/n): ").strip().lower()
    
    if choice == 'y':
        try:
            sys.path.append(str(dashboard_dir))
            from detection.ambulance_detector import test_detector
            
            print("\n🔍 Testing detector...")
            if test_detector():
                print("✅ Detector test successful!")
                
                print(f"\n📊 DASHBOARD STRUCTURE:")
                print_directory_structure(dashboard_dir)
                
                return True
            else:
                print("❌ Detector test failed!")
                return False
                
        except Exception as e:
            print(f"❌ Test failed: {e}")
            return False
    
    return True

def print_directory_structure(base_path: Path):
    """Print the dashboard directory structure"""
    print(f"\n📁 {base_path.name}/")
    
    # Essential directories to show
    dirs_to_show = [
        ("models/", "🧠 Trained models"),
        ("detection/", "🔍 Detection logic"),
        ("backend/", "🌐 API server"),
        ("config/", "⚙️  Configuration"),
        ("uploads/", "📤 Upload folder"),
        ("output/", "📥 Results folder")
    ]
    
    for dir_name, description in dirs_to_show:
        dir_path = base_path / dir_name.rstrip('/')
        if dir_path.exists():
            print(f"├── {dir_name:<12} {description}")
            
            # Show key files in each directory
            if dir_name == "models/":
                for model_file in dir_path.glob("*.pt"):
                    print(f"│   ├── {model_file.name}")
            elif dir_name == "detection/":
                for py_file in dir_path.glob("*.py"):
                    print(f"│   ├── {py_file.name}")
            elif dir_name == "backend/":
                if (dir_path / "main.py").exists():
                    print(f"│   ├── main.py (API server)")
            elif dir_name == "config/":
                if (dir_path / "data.yaml").exists():
                    print(f"│   ├── data.yaml (model config)")
    
    # Show important files
    important_files = [
        ("requirements.txt", "📋 Dependencies"),
        ("README.md", "📖 Documentation")
    ]
    
    for file_name, description in important_files:
        if (base_path / file_name).exists():
            print(f"├── {file_name:<12} {description}")

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = [
        "torch",
        "ultralytics", 
        "opencv-python",
        "fastapi",
        "uvicorn"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print(f"Install with: pip install {' '.join(missing_packages)}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    
    if success:
        print(f"\n🎉 Dashboard setup complete!")
        print(f"🚀 Ready for ambulance detection!")
    else:
        print(f"\n❌ Setup incomplete. Please check requirements.")
