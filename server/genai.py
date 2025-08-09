import os
import openai

# Set your OpenAI API key
client = openai.OpenAI(
    # This is the default and can be omitted
    api_key=os.environ.get("OPENAI_API_KEY"),
)

def analyze_tablet_data(data):
    """
    Function to analyze tablet data using ChatGPT.
    :param data: A string representation of the tablet data.
    :return: A generated report as a string.
    """
    with open('prompts/dev_prompt.txt', 'r') as file:
        dev_prompt = file.read()
    with open('prompts/system_prompt.txt', 'r') as file:
        system_prompt = file.read()
    with open('prompts/daily_report.txt', 'r') as file:
        prompt = file.read()
        prompt = prompt.format(data=data)

    try:
        completion = client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {
                    "role": "system", "content": system_prompt
                },
                {
                    "role": "developer", "content": dev_prompt
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            max_tokens=1500,
        )
        report = completion.choices[0].message.content
        return report
    except Exception as e:
        return f"An error occurred: {e}"

# Example usage
if __name__ == "__main__":
    # Replace this with your actual tablet data
    tablet_data = """
    ID, TIMESTAMP_EYE_BLINKED
    1, "2025-08-09T03:07:48.872100Z"
    2, "2025-08-09T03:07:49.582484Z"
    3, "2025-08-09T03:07:50.872100Z"
    4, "2025-08-09T03:07:51.582484Z"
    5, "2025-08-09T03:07:52.224359Z"
    """
    
    report = analyze_tablet_data(tablet_data)
    print("Generated Report:")
    print(report)