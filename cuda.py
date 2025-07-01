import torch
print("CUDA Available:", torch.cuda.is_available())
print("cuDNN Version:", torch.backends.cudnn.version())
print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "Not available")
