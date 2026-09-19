import os
import json
import random
import shutil
from collections import defaultdict
from PIL import Image

def prepare_splits(
    dataset_dir: str = r"C:\Users\SHAMSREENIR\OneDrive\Desktop\train\train",
    output_splits_path: str = r"C:\Users\SHAMSREENIR\.gemini\antigravity\scratch\industrial-ai-copilot\backend\app\assets\organizer_splits.json",
    gallery_dir: str = r"C:\Users\SHAMSREENIR\.gemini\antigravity\scratch\industrial-ai-copilot\backend\app\assets\organizer_test_gallery",
    seed: int = 42,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15
):
    print(f"=== SCANNING ORGANIZER DATASET AT: {dataset_dir} ===")
    if not os.path.exists(dataset_dir):
        raise FileNotFoundError(f"Dataset directory not found: {dataset_dir}")

    # Discover classes dynamically
    classes = sorted([d for d in os.listdir(dataset_dir) if os.path.isdir(os.path.join(dataset_dir, d))])
    print(f"Discovered classes ({len(classes)}): {classes}")

    class_to_files = defaultdict(list)
    total_images = 0

    for cls in classes:
        cls_path = os.path.join(dataset_dir, cls)
        # Scan image files
        valid_files = [
            f for f in sorted(os.listdir(cls_path))
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))
        ]
        class_to_files[cls] = valid_files
        total_images += len(valid_files)
        print(f"  Class '{cls}': {len(valid_files)} valid images")

    print(f"Total images found dynamically: {total_images}")

    # Set random seed for reproducibility
    random.seed(seed)

    splits = {
        "dataset_metadata": {
            "dataset_root": dataset_dir,
            "classes": classes,
            "class_to_idx": {cls: idx for idx, cls in enumerate(classes)},
            "total_images": total_images,
            "seed": seed,
            "ratios": {
                "train": train_ratio,
                "val": val_ratio,
                "test": test_ratio
            }
        },
        "train": [],
        "val": [],
        "test": []
    }

    class_split_counts = defaultdict(dict)

    for cls in classes:
        files = class_to_files[cls].copy()
        random.shuffle(files)

        n = len(files)
        n_train = int(n * train_ratio)
        n_val = int(n * val_ratio)
        # Test gets the remainder to guarantee all images are assigned
        n_test = n - n_train - n_val

        train_files = files[:n_train]
        val_files = files[n_train:n_train + n_val]
        test_files = files[n_train + n_val:]

        class_split_counts[cls] = {
            "total": n,
            "train": len(train_files),
            "val": len(val_files),
            "test": len(test_files)
        }

        for f in train_files:
            splits["train"].append({"filename": f, "class": cls, "rel_path": os.path.join(cls, f)})
        for f in val_files:
            splits["val"].append({"filename": f, "class": cls, "rel_path": os.path.join(cls, f)})
        for f in test_files:
            splits["test"].append({"filename": f, "class": cls, "rel_path": os.path.join(cls, f)})

    splits["dataset_metadata"]["split_counts"] = {
        "train_total": len(splits["train"]),
        "val_total": len(splits["val"]),
        "test_total": len(splits["test"]),
        "per_class": dict(class_split_counts)
    }

    print("\n--- SPLIT SUMMARY ---")
    print(f"Train: {len(splits['train'])} images")
    print(f"Val:   {len(splits['val'])} images")
    print(f"Test:  {len(splits['test'])} images")

    # Save manifest
    os.makedirs(os.path.dirname(output_splits_path), exist_ok=True)
    with open(output_splits_path, "w") as f:
        json.dump(splits, f, indent=2)
    print(f"Saved split manifest to: {output_splits_path}")

    # Create curated held-out test gallery (3 per class = 15 images)
    os.makedirs(gallery_dir, exist_ok=True)
    gallery_manifest = []

    for cls in classes:
        test_cls_files = [item for item in splits["test"] if item["class"] == cls]
        # Pick 3 representative samples
        samples = test_cls_files[:3]
        for idx, s in enumerate(samples):
            src_path = os.path.join(dataset_dir, s["rel_path"])
            dest_filename = f"{cls}_test_sample_{idx+1}.png"
            dest_path = os.path.join(gallery_dir, dest_filename)
            shutil.copy2(src_path, dest_path)

            gallery_manifest.append({
                "sample_id": dest_filename,
                "display_name": f"{cls.capitalize()} Test #{idx+1}",
                "ground_truth_class": cls,
                "is_defective": (cls != "normal"),
                "expected_decision": "ACCEPTABLE" if cls == "normal" else "DEFECTIVE",
                "source_file": s["filename"],
                "relative_path": dest_filename
            })

    gallery_manifest_path = os.path.join(gallery_dir, "manifest.json")
    with open(gallery_manifest_path, "w") as f:
        json.dump(gallery_manifest, f, indent=2)
    print(f"Saved {len(gallery_manifest)} test gallery images & manifest to: {gallery_dir}")

if __name__ == "__main__":
    prepare_splits()
