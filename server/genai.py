import os
import openai
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from io import BytesIO
from datetime import datetime


# Set your OpenAI API key
client = openai.OpenAI(
    # This is the default and can be omitted
    api_key=os.environ.get("OPENAI_API_KEY"),
)

def get_weather_forecast():
    """
    Function to get the weather forecast for tomorrow.
    This is a placeholder function. You can replace it with actual API calls to a weather service.
    :return: A string representing the weather forecast for tomorrow.
    """
    # Example static response, replace with actual API call
    return "맑음, 기온 25도, 습도 20%, 미세먼지 매우 나쁨"

def load_blink_data(file_path: str) -> str:
    """
    Load blink data from a CSV file.
    :param file_path: Path to the CSV file containing blink data.
    :return: A string representation of the blink data.
    """
    try:
        df = pd.read_csv(file_path)
        return df
    except Exception as e:
        return f"An error occurred while loading the data: {e}"

def analyze_tablet_data(data):
    # Expected output dataframe format:
    # ID, DATE, HOUR, BLINKS_PER_HOUR
    # 1, "2025-08-06", 3, 400
    # 2, "2025-08-06", 4, 300
    # 3, "2025-08-06", 5, 350

    timestamps = []
    for i, row in data.iterrows(): # Skip header line
        parsed_timestamp = datetime.fromisoformat(row.TIMESTAMP.strip().replace("Z", "+00:00"))
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

def plot_blink_data(data: pd.DataFrame, date: str):
    """
    Function to plot blink data.
    :param data: DataFrame containing the blink data.
    :return: None
    """
    # Filter data for the given date
    df = data[pd.to_datetime(data['TIMESTAMP']).dt.date == datetime.strptime(date, "%Y-%m-%d").date()]
    if df.empty:
        print(f"No data available for {date}")
        return
    print(len(df), "rows gathered this session")

    df['TIMESTAMP'] = pd.to_datetime(df['TIMESTAMP'])
    grouped = df.groupby(pd.Grouper(key='TIMESTAMP', freq='h'))['ID'].count()
    grouped.index = grouped.index.strftime('%H:%M')

    sns.set_theme(style="white")
    plt.figure(figsize=(4, 3))
    sns.lineplot(data=grouped, marker='o', color='b', linewidth=2.5)

    # Rotate x ticks to 30 degrees
    plt.xticks(rotation=45)

    # Remove x and y labels
    plt.xlabel('')
    plt.ylabel('')

    # Adjust y tick interval to 100
    plt.yticks(range(0, grouped.max(), 100))

    # Draw a horizontal red line at y=100 with low opacity
    plt.axhline(y=600, color='deepskyblue', linestyle='--', alpha=0.5)
    plt.text(grouped.index[-1], 600, '😊', fontsize=14, ha='center', va='bottom', color='deepskyblue')

    # Remove grid and axis lines
    sns.despine(left=False, bottom=False)

    plt.tight_layout()
    image_buffer = BytesIO()
    plt.savefig(image_buffer, format='png', bbox_inches='tight')
    image_buffer.seek(0)
    image = image_buffer.getvalue()
    image_buffer.close()
    plt.close()

    return image

def generate_report_text(data: pd.DataFrame) -> str:
    """
    Function to analyze tablet data using ChatGPT.
    :param data: DataFrame containing the blink data.
    :return: A generated report as a string.
    """
    # today = datetime.date.today().strftime("%Y-%m-%d %H:%M:%S")
    today = "2025-08-10 11:13:01"
    weather = get_weather_forecast()

    text_data = "DATE, HOUR, BLINKS_PER_HOUR\n" + \
        "\n".join(", ".join([row.DATE.strftime("%Y-%m-%d"), str(row.HOUR), str(row.BLINKS_PER_HOUR)]) for _, row in data.iterrows())
    with open('prompts/system_prompt.txt', 'r') as file:
        system_prompt = file.read().format(today=today, data=text_data, weather=weather)
    with open('prompts/daily_report.txt', 'r') as file:
        prompt = file.read()
        prompt = prompt
    print("System Prompt:\n", system_prompt)
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

def generate_report(raw_data: pd.DataFrame, data: pd.DataFrame) -> str:
    """
    Function to generate a report from the blink data.
    :param data: DataFrame containing the blink data.
    :return: A generated report as a string.
    """
    # Plot the blink data
    # date = datetime.now().strftime("%Y-%m-%d")
    date = datetime.now().strftime("2025-08-08")
    image = plot_blink_data(raw_data, date)

    # Generate the report text
    report_text = generate_report_text(data)

    # Return the report text and image
    return {
        "report": report_text,
        "daily_line_plot": image
    }


# Example usage
if __name__ == "__main__":
    # Replace this with your actual tablet data
    raw_data = load_blink_data('data/blink_data_increase.csv')
    analyzed = analyze_tablet_data(raw_data)
    report = generate_report(raw_data, analyzed)
    print("Generated Report:")
    print(report['report'])