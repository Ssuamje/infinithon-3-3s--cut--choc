import os
import openai
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from io import BytesIO
from datetime import datetime


INTERVAL_THRESHOLD = 60  # seconds
IDEAL_BLINK_PER_MINUTE = 10
MIN_LOG_NUM = 5


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

    data['DATE_MONTH'] = data.TIMESTAMP.apply(lambda x: x.strftime("%Y-%m"))
    data['DATE_WEEK'] = data.TIMESTAMP.apply(lambda x: x.strftime("%Y") + "-W" + str(x.isocalendar()[1]))
    data['DATE_HOUR'] = data.TIMESTAMP.apply(lambda x: x.strftime("%Y-%m-%dT%H"))

    last_month = data[data.DATE_MONTH.apply(lambda x: datetime.strptime(x, "%Y-%m")) < datetime.strptime(data.iloc[-1].TIMESTAMP.strftime("%Y-%m"), "%Y-%m")]
    last_week = data[data.DATE_WEEK == data.iloc[-1].TIMESTAMP.strftime("%Y") + "-W" + str(data.iloc[-1].TIMESTAMP.isocalendar()[1] - 1)]
    this_week = data[data.DATE_WEEK == data.iloc[-1].TIMESTAMP.strftime("%Y") + "-W" + str(data.iloc[-1].TIMESTAMP.isocalendar()[1])]
    bpm_history_month = 60 / last_month.groupby('DATE_MONTH').BLINK_INTERVAL.mean()
    bpm_history_week = 60 / last_week.groupby('DATE_WEEK').BLINK_INTERVAL.mean()
    bpm_this_week = 60 / this_week.groupby('DATE_HOUR').BLINK_INTERVAL.mean()
    
    return (bpm_history_month, bpm_history_week, bpm_this_week)

def clean_and_slide_data(data: pd.DataFrame, date: str) -> pd.DataFrame:
    """
    Clean and slide the blink data.
    :param data: DataFrame containing the blink data.
    :return: Cleaned and slid DataFrame.
    """

    data['TIMESTAMP'] = pd.to_datetime(data['TIMESTAMP'])
    data['BLINK_INTERVAL'] = data.TIMESTAMP.diff()
    data['BLINK_INTERVAL'] = data['BLINK_INTERVAL'].dt.seconds
    data['BLINK_PER_MINUTE'] = 60 / data['BLINK_INTERVAL']
    data.dropna(inplace=True)
    data = data[data['BLINK_INTERVAL'] < INTERVAL_THRESHOLD]
    slided_data = data.copy()
    
    # Filter data for the given date
    filtered_df = data[pd.to_datetime(data['TIMESTAMP']).dt.strftime("%Y-%m-%d") == date]
    if filtered_df.empty:
        print(f"No data available for {date}")
        return
    print(len(filtered_df), "rows gathered this session")

    min_filter = (filtered_df.groupby(pd.Grouper(key='TIMESTAMP', freq='h'))['BLINK_PER_MINUTE'].count() >= MIN_LOG_NUM).values
    grouped = filtered_df.groupby(pd.Grouper(key='TIMESTAMP', freq='h'))['BLINK_PER_MINUTE'].mean()
    grouped = grouped[min_filter]
    grouped.index = grouped.index.strftime('%H')
    
    return slided_data, grouped

def plot_blink_data(cleaned_data: pd.DataFrame, date: str):
    """
    Function to plot blink data.
    :param data: DataFrame containing the blink data.
    :return: None
    """
    # Plot the blink data
    sns.set_theme(style="whitegrid")
    plt.figure(figsize=(4, 3))
    sns.lineplot(data=cleaned_data, marker='o', color='b', linewidth=2.5)

    # Rotate x ticks
    plt.xticks(rotation=45)
    lower_y = int(cleaned_data.min()) - 1 if cleaned_data.min() < IDEAL_BLINK_PER_MINUTE else IDEAL_BLINK_PER_MINUTE - 1
    upper_y = int(cleaned_data.max()) + 1 if cleaned_data.max() > IDEAL_BLINK_PER_MINUTE else IDEAL_BLINK_PER_MINUTE + 1
    plt.ylim(lower_y, upper_y)

    # Remove x and y labels
    plt.xlabel('')
    plt.ylabel('')

    # Draw a horizontal red line at y=100 with low opacity
    plt.axhline(y=IDEAL_BLINK_PER_MINUTE, color='deepskyblue', linestyle='--', alpha=0.5)

    # Draw the emoji with the specified font
    plt.text(cleaned_data.index[-1], IDEAL_BLINK_PER_MINUTE, '😊', fontsize=14, ha='center', va='bottom', color='deepskyblue')

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

def generate_report_text(user_info: dict = None, histories: dict = None) -> str:
    """
    Function to analyze tablet data using ChatGPT.
    :param data: DataFrame containing the blink data.
    :return: A generated report as a string.
    """
    # today = datetime.date.today().strftime("%Y-%m-%d %H:%M:%S")
    today = "2025-08-10 11:13:01"
    weather = get_weather_forecast()

    last_month, last_week, this_week = histories
    text_data = "================================\n"
    text_data += "지난 월별 분당 평균 눈 깜빡임 횟수:\n" + \
        "\n".join(f"{row.DATE_MONTH}, {row.BLINK_INTERVAL:.2f}" for _, row in last_month.to_frame().reset_index().iterrows()) + "\n"
    text_data += "--------------------------------\n"
    text_data += "지난 주의 분당 평균 눈 깜빡임 횟수:\n" + \
        "\n".join(f"{row.DATE_WEEK}, {row.BLINK_INTERVAL:.2f}" for _, row in last_week.to_frame().reset_index().iterrows()) + "\n"
    text_data += "--------------------------------\n"
    text_data += "이번 주의 일별 분당 평균 눈 깜빡임 횟수:\n" + \
        "\n".join(f"{row.DATE_HOUR}, {row.BLINK_INTERVAL:.2f}" for _, row in this_week.to_frame().reset_index().iterrows()) + "\n"
    text_data += "===============================\n"
    
    with open('prompts/system_prompt.txt', 'r') as file:
        system_prompt = file.read().format(today=today, data=text_data, weather=weather, user=user_info)
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

def generate_report(raw_data: pd.DataFrame, user_info: dict = None) -> str:
    """
    Function to generate a report from the blink data.
    :param data: DataFrame containing the blink data.
    :return: A generated report as a string.
    """
    # Plot the blink data
    # date = datetime.now().strftime("%Y-%m-%d")
    date = datetime.now().strftime("2025-08-08")
    slided_data, cleaned_data = clean_and_slide_data(raw_data, date)
    image = plot_blink_data(cleaned_data, date)
    daily_bpm = cleaned_data.mean() if not cleaned_data.empty else 0

    # Generate the report text
    analyzed = analyze_tablet_data(slided_data)
    report_text = generate_report_text(user_info=user_info, histories=analyzed)

    # Return the report text and image
    return {
        "report": report_text,
        "daily_blink_per_minute": daily_bpm,
        "daily_line_plot": image
    }


# Example usage
if __name__ == "__main__":
    # Replace this with your actual tablet data
    raw_data = load_blink_data('data/blink_data_increase.csv')
    user_info = {
        'joined_at': raw_data['TIMESTAMP'].min(),
    }
    report = generate_report(raw_data, user_info=user_info)
    print("Generated Report:")
    print(report['report'])