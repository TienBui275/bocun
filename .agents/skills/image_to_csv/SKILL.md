---
name: image_to_csv
description: Workflow for reading text and exercises from images and converting them into a structured CSV file.
---

# Extract Data from Images to CSV

This skill outlines the standard workflow for extracting structured information, such as educational exercises or tabular data, from image files and saving them to a `.csv` file.

## Required Steps

1. **Locate and List Images**: 
   Find the folder containing the target images using the `list_dir` tool. Note down the absolute paths of the image files (e.g., `.png`, `.jpg`).

2. **Read Image Contents**: 
   Use the `view_file` tool on each image path. This tool allows you to read the contents of binary image files directly into your context. For multiple images, you can read them one by one or in parallel.

3. **Information Extraction & Formatting**: 
   For each image:
   - Read the textual content and interpret the context (e.g., math problems, tabular data).
   - If there are visual illustations (like a table or geometric shapes), recreate them textually using Markdown tables or clear textual descriptions.
   - Map the extracted information to the required CSV schema (e.g., `question`, `question_type`, `options`, `explanation`, `hint`, `correct_answer`).
   - If the schema requires specific formatting for lists (like multiple-choice options), format them appropriately (e.g., escaping lists as JSON strings).

4. **Generate the CSV Safely**:
   Do NOT try to manually format comma-separated strings inside bash, as this can easily lead to escaping issues with quotes and newlines.
   - Write a small Python script using the native `csv` module (e.g., `csv.DictWriter`).
   - Define your extracted row data as a list of Python dictionaries inside the script.
   - Specify the target CSV file path, properly handling any missing directories using `os.makedirs`.
   - Ensure you use `encoding='utf-8'` and `newline=''` when writing the CSV.

5. **Execute and Save**:
   Run the generated Python script using the `run_command` tool (e.g., `python3 script_name.py`). Verify that the output confirms the successful creation of the CSV file.

6. **Double-Check and Correct**:
   - Use the `view_file` tool to read the generated CSV file.
   - Cross-check the content in the CSV against the original images to ensure accuracy, proper formatting, and correct data mapping.
   - If any errors, typos, or mapping mistakes are found, correct them (either by modifying the Python script and re-running it, or by modifying the CSV directly using file editing tools).
