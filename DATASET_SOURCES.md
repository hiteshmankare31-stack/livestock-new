# Dataset sources used by the Smart Livestock AI pipeline

The downloader uses these public sources:

1. **Lumpy Skin Images Dataset** — Kaggle / Mendeley Data. 324 Lumpy Skin + 700 Normal Skin images. CC BY 4.0.
   https://www.kaggle.com/datasets/warcoder/lumpy-skin-images-dataset

2. **Cow Lumpy Disease Dataset** — Kaggle. Healthy and lumpy cow images.
   https://www.kaggle.com/datasets/shivamagarwal29/cow-lumpy-disease-dataset

3. **FMD Cattle** — Zenodo, University of Surrey / Abbie Osborn. CC BY 4.0.
   https://zenodo.org/records/7779246

4. **Animal Disease Resources** — CFSPH, Iowa State University. Used as a veterinary reference resource, not as an automatically scraped training dataset.
   https://www.cfsph.iastate.edu/diseaseinfo/

5. **Cattle Diseases Dataset** — Kaggle. Additional research reference for cattle image classification.
   https://www.kaggle.com/datasets/devang03mgr/cattle-diseases-datasets

The training pipeline deliberately does not scrape CFSPH images automatically. Dataset licenses and attribution requirements should be checked before redistribution.
