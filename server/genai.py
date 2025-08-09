import os
import datetime
import openai
import pandas as pd

# Set your OpenAI API key
client = openai.OpenAI(
    # This is the default and can be omitted
    api_key=os.environ.get("OPENAI_API_KEY"),
)

def analyze_tablet_data(data):
    # Expected output dataframe format:
    # ID, DATE, HOUR, BLINKS_PER_HOUR
    # 1, "2025-08-06", 3, 400
    # 2, "2025-08-06", 4, 300
    # 3, "2025-08-06", 5, 350
    # 4, "2025-08-06", 6, 250
    # 5, "2025-08-06", 7, 400
    # 6, "2025-08-08", 3, 200
    # 7, "2025-08-08", 4, 300
    # 8, "2025-08-08", 5, 300
    # 9, "2025-08-08", 6, 400
    # 10, "2025-08-08", 7, 350
    # 11, "2025-08-09", 3, 500
    # 12, "2025-08-09", 4, 400
    # 13, "2025-08-09", 5, 600
    # 14, "2025-08-09", 6, 450
    # 15, "2025-08-09", 7, 550

    timestamps = []
    for line in data.splitlines()[1:]: # Skip header line
        if line.strip():  # Check if line is not empty
            id_, timestamp = line.strip().split(",")
            parsed_timestamp = datetime.datetime.fromisoformat(timestamp.strip().replace("Z", "+00:00"))
            timestamps.append(parsed_timestamp)
    
    # Example processing: Count blinks per hour
    # Count blinks per hour
    blink_counts = {}
    for timestamp in timestamps:
        hour = timestamp.replace(minute=0, second=0, microsecond=0)
        if hour not in blink_counts:
            blink_counts[hour] = 0
        blink_counts[hour] += 1

    # Create a DataFrame
    data_rows = []
    for hour, blinks in blink_counts.items():
        data_rows.append({
            "ID": len(data_rows) + 1,
            "DATE": hour.date(),
            "HOUR": hour.hour,
            "BLINKS_PER_HOUR": blinks
        })
    df = pd.DataFrame(data_rows)

    # TODO: interpolate logs where there are no enough blinks in a given hour
    return df

def get_weather_forecast():
    """
    Function to get the weather forecast for tomorrow.
    This is a placeholder function. You can replace it with actual API calls to a weather service.
    :return: A string representing the weather forecast for tomorrow.
    """
    # Example static response, replace with actual API call
    return "맑음, 기온 25도, 습도 20%, 미세먼지 매우 나쁨"

def generate_report(data: str) -> str:
    """
    Function to analyze tablet data using ChatGPT.
    :param data: A string representation of the tablet data.
    :return: A generated report as a string.
    """
    today = datetime.date.today().strftime("%Y-%m-%d %H:%M:%S")
    weather = get_weather_forecast()

    with open('prompts/system_prompt.txt', 'r') as file:
        system_prompt = file.read().format(today=today, data=data, weather=weather)
    with open('prompts/daily_report.txt', 'r') as file:
        prompt = file.read()
        prompt = prompt
    print("System Prompt:", system_prompt)
    print("-------------------------------------")

    try:
        completion = client.chat.completions.create(
            model="gpt-4.1-nano",
            messages=[
                {
                    "role": "system", "content": system_prompt
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            max_tokens=1500,
            temperature=0.8,
            top_p=0.9,
        )
        report = completion.choices[0].message.content
        return report
    except Exception as e:
        return f"An error occurred: {e}"

# Example usage
if __name__ == "__main__":
    # Replace this with your actual tablet data
    raw_data = """ID, TIMESTAMP_EYE_BLINKED
    1, 2025-08-07T03:06:30.872100Z
    2, 2025-08-07T03:07:10.582484Z
    3, 2025-08-07T03:07:30.872100Z
    4, 2025-08-07T03:07:51.582484Z
    1, 2025-08-07T03:07:33.224359Z
    2, 2025-08-08T03:07:43.872100Z
    3, 2025-08-08T03:07:45.582484Z
    4, 2025-08-08T03:07:49.872100Z
    5, 2025-08-08T03:07:51.582484Z
    6, 2025-08-08T03:07:52.224359Z
    1, 2025-08-09T03:07:48.872100Z
    2, 2025-08-09T03:07:49.582484Z
    3, 2025-08-09T03:07:50.872100Z
    4, 2025-08-09T03:07:51.582484Z
    5, 2025-08-09T03:07:52.224359Z
    """

    analyzed = analyze_tablet_data(raw_data)
    report = generate_report(analyzed)
    print("Generated Report:")
    print(report)