export const BASE_API_URL = "http://localhost:8080/api";

export const codeTemplates = {
  bubble_sort: {
    python: `# Bubble Sort with data visualisation
import json
arr = [64, 34, 25, 12, 22, 11, 90]
print("Initial Array:", arr)

def emit(a, i=None, j=None, swap=False):
    print("__VIS__:" + json.dumps({"arr": a, "i": i, "j": j, "swap": swap, "type": "sort"}))

emit(arr)
n = len(arr)
for i in range(n):
    for j in range(0, n - i - 1):
        emit(arr, j, j + 1)
        if arr[j] > arr[j + 1]:
            emit(arr, j, j + 1, swap=True)
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
emit(arr)
print("Sorted Array:", arr)
`,
  },
  binary_search: {
    python: `# Binary Search with data visualisation
import json
arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
x = 23
print(f"Searching for {x} in sorted array: {arr}")

def emit(a, l=None, r=None, m=None, found=None):
    print("__VIS__:" + json.dumps({"arr": a, "low": l, "high": r, "mid": m, "found": found, "type": "search"}))

def binary_search(arr, x):
    low = 0; high = len(arr) - 1
    emit(arr, low, high)
    while low <= high:
        mid = (high + low) // 2
        emit(arr, low, high, mid)
        if arr[mid] < x: low = mid + 1
        elif arr[mid] > x: high = mid - 1
        else:
            emit(arr, low, high, mid, found=True)
            return mid
    emit(arr, low, high, found=False)
    return -1

result = binary_search(arr, x)
if result != -1: print(f"Element is present at index {result}")
else: print("Element is not present in array")
`
  }
};