# app/models/merger.py
import numpy as np
import torch
from torchvision.ops import nms

def merge_results(result1, result2, model1_names=None, model2_names=None):
    model1_list = results_to_list(result1[0], model1_names)
    model2_list = results_to_list(result2[0], model2_names)

    return merge_detections(model1_list, model2_list)

def merge_detections(model1_detections, model2_detections):
    final_detections = []
    io_trash_hold = 0.8
    for det1 in model1_detections:
        best_match = None
        best_iou = 0
        for det2 in model2_detections:
            iou = compute_iou(det1['bbox'], det2['bbox'])
            if iou > best_iou:
                best_iou = iou
                best_match = det2
        if best_iou >= io_trash_hold:
            # объединяем
            merged_bbox = weighted_bbox_average(det1, best_match)
            merged_confidence = (det1['confidence'] + best_match['confidence']) / 2
            merged_class = det1['class'] if det1['class'] == best_match['class'] else class_with_higher_confidence(
                det1, best_match)
            final_detections.append({'bbox': merged_bbox, 'confidence': merged_confidence, 'class': merged_class})
        else:
            # оставляем det1
            final_detections.append(det1)

    # добавляем объекты из model2, которые не совпали ни с одним объектом из model1
    for det2 in model2_detections:
        if not any(compute_iou(det2['bbox'], d['bbox']) >= 0.5 for d in final_detections):
            final_detections.append(det2)

    # финальная NMS
    final_detections = non_max_suppression(final_detections, iou_threshold=0.6)
    return final_detections


def compute_iou(box1, box2):
    """
    box = [x1, y1, x2, y2]
    """
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])

    inter_area = max(0, x2 - x1) * max(0, y2 - y1)

    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])

    iou = inter_area / (box1_area + box2_area - inter_area + 1e-6)
    return iou


def weighted_bbox_average(det1, det2):
    confidence1, confidence2 = det1['confidence'], det2['confidence']
    bbox1, bbox2 = np.array(det1['bbox']), np.array(det2['bbox'])
    merged_bbox = (bbox1 * confidence1 + bbox2 * confidence2) / (confidence1 + confidence2)
    return merged_bbox.tolist()

def class_with_higher_confidence(det1, det2):
    """
    det1, det2: {'bbox': [...], 'class_name': int, 'confidence': float}
    """
    if det1['confidence'] >= det2['confidence']:
        return det1['class']
    else:
        return det2['class']


def non_max_suppression(detections, iou_threshold=0.6):
    """
    detections: list of dicts {'bbox': [x1, y1, x2, y2], 'confidence': float, 'class_name': int}
    """
    if not detections:
        return []

    # группируем по классам
    final_dets = []
    detections_by_class = {}
    for det in detections:
        class_name = det['class']
        detections_by_class.setdefault(class_name, []).append(det)

    for class_name, dets in detections_by_class.items():
        boxes = torch.tensor([d['bbox'] for d in dets], dtype=torch.float32)
        confidences = torch.tensor([d['confidence'] for d in dets])
        keep_indices = nms(boxes, confidences, iou_threshold)
        for idx in keep_indices:
            final_dets.append(dets[idx])

    return final_dets

def results_to_list(results, local_names):
    dets = []
    for box in results.boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        confidence = float(box.conf[0])
        class_id = int(box.cls[0])
        class_name = local_names.get(class_id)

        dets.append({
            'bbox': [x1, y1, x2, y2],
            'confidence': confidence,
            'class': class_name,
        })
    return dets
