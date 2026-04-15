# Videos Directory

This directory stores the **9,921 Filipino Sign Language (FSL) video clips** for the BISIG project.

## 📥 Dataset Access
Due to the large total size (~1.1 GB), these videos are hosted on **Hugging Face** rather than Git.

**Hugging Face Dataset:** [Golgrax/bisig-fsl-dataset](https://huggingface.co/datasets/Golgrax/bisig-fsl-dataset)

## 🛠️ How to download
If you need to restore these videos to this folder, run:

```bash
pip install -U "huggingface_hub[cli]"
huggingface-cli download Golgrax/bisig-fsl-dataset --repo-type dataset --local-dir .. --include "videos/*"
```
