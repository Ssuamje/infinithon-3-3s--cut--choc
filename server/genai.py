import os
import openai
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
from io import BytesIO
from datetime import datetime, timezone
import numpy as np




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
        if blinks < MIN_LOG_NUM:
            continue
        data_rows.append({
            "ID": len(data_rows) + 1,
            "DATE": hour.date(),
            "HOUR": hour.hour,
            "BLINKS_PER_HOUR": blinks
        })
    df = pd.DataFrame(data_rows)

    # TODO: interpolate logs where there are no enough blinks in a given hour
    return df

def clean_and_slide_data(data: pd.DataFrame, date: str) -> pd.DataFrame:
    # 날짜 필터
    filtered_df = data[pd.to_datetime(data['TIMESTAMP']).dt.date
                       == datetime.strptime(date, "%Y-%m-%d").date()]
    if filtered_df.empty:
        print(f"No data available for {date}")
        return pd.Series(dtype=float)

    filtered_df['TIMESTAMP'] = pd.to_datetime(filtered_df['TIMESTAMP'])

    # 간격(초) 계산: total_seconds() 사용
    filtered_df['BLINK_INTERVAL'] = filtered_df['TIMESTAMP'].diff().dt.total_seconds()

    # 0초 또는 음수 간격 제거 (분모 0 방지)
    filtered_df = filtered_df[filtered_df['BLINK_INTERVAL'] > 0]

    # BPM 계산
    filtered_df['BLINK_PER_MINUTE'] = 60.0 / filtered_df['BLINK_INTERVAL']

    # inf/-inf 제거
    filtered_df.replace([np.inf, -np.inf], np.nan, inplace=True)
    filtered_df.dropna(subset=['BLINK_PER_MINUTE'], inplace=True)

    # 너무 긴 간격 필터 (노이즈 컷)
    filtered_df = filtered_df[filtered_df['BLINK_INTERVAL'] < INTERVAL_THRESHOLD]

    # 시간별 평균(로그 수가 충분한 시간대만)
    grouped = filtered_df.groupby(pd.Grouper(key='TIMESTAMP', freq='h'))['BLINK_PER_MINUTE']
    min_filter = (grouped.count() >= MIN_LOG_NUM).values
    grouped_mean = grouped.mean()
    grouped_mean = grouped_mean[min_filter]

    # 시:분류용 인덱스 정리
    grouped_mean.index = grouped_mean.index.strftime('%H')

    # 비어있으면 빈 시리즈
    if grouped_mean.empty:
        return pd.Series(dtype=float)

    return grouped_mean

def plot_blink_data(cleaned_data: pd.DataFrame, date: str):
    import numpy as np
    import pandas as pd
    sns.set_theme(style="whitegrid")

    # Series/DF → 숫자 시리즈로 정규화
    if isinstance(cleaned_data, pd.DataFrame):
        s = pd.to_numeric(cleaned_data.iloc[:, 0], errors='coerce')
    else:
        s = pd.to_numeric(cleaned_data, errors='coerce')

    # inf/-inf 제거
    s = s.replace([np.inf, -np.inf], np.nan).dropna()

    # 데이터 없으면 플레이스홀더 이미지
    if s.empty:
        plt.figure(figsize=(4, 3))
        plt.title(f"No blink data for {date}")
        plt.tight_layout()
        buf = BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img = buf.getvalue()
        buf.close()
        plt.close()
        return img

    plt.figure(figsize=(4, 3))
    sns.lineplot(x=range(len(s)), y=s.values, marker='o', linewidth=2.5)

    # x축 라벨을 시간대처럼 보이게
    plt.xticks(ticks=range(len(s)), labels=getattr(cleaned_data, 'index', range(len(s))), rotation=45)

    # y축 안전 계산
    s_min, s_max = float(np.nanmin(s.values)), float(np.nanmax(s.values))
    lower_y = int(s_min) - 1 if s_min < IDEAL_BLINK_PER_MINUTE else IDEAL_BLINK_PER_MINUTE - 1
    upper_y = int(s_max) + 1 if s_max > IDEAL_BLINK_PER_MINUTE else IDEAL_BLINK_PER_MINUTE + 1
    if lower_y == upper_y:  # 동일하면 보정
        upper_y = lower_y + 2
    plt.ylim(lower_y, upper_y)

    plt.xlabel('')
    plt.ylabel('')
    plt.axhline(y=IDEAL_BLINK_PER_MINUTE, linestyle='--', alpha=0.5)

    # 이모지 위치도 인덱스 길이 기반으로
    plt.text(len(s)-1, IDEAL_BLINK_PER_MINUTE, '😊', fontsize=14, ha='center', va='bottom')

    sns.despine(left=False, bottom=False)
    plt.tight_layout()
    buf = BytesIO()
    plt.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    img = buf.getvalue()
    buf.close()
    plt.close()
    return img


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

    # ✅ raw_data 첫 타임스탬프의 '날짜'를 사용
    ts = pd.to_datetime(raw_data["TIMESTAMP"], utc=True, errors="coerce").dropna()
    if ts.empty:
        # 데이터가 정말 없으면 빈 리포트 반환(혹은 적절히 처리)
        return {
            "report": "No valid timestamps in raw_data.",
            "daily_blink_per_minute": 0,
            "daily_line_plot": None,
        }
    date = ts.min().date().strftime("%Y-%m-%d")

    cleaned_data = clean_and_slide_data(raw_data, date)
    image = plot_blink_data(cleaned_data, date)
    daily_bpm = (cleaned_data.mean() if cleaned_data is not None and not cleaned_data.empty else 0)

    report_text = generate_report_text(data)
    return {
        "report": report_text,
        "daily_blink_per_minute": daily_bpm,
        "daily_line_plot": image,
    }

# Example usage
if __name__ == "__main__":
    # Replace this with your actual tablet data
    raw_data = load_blink_data('data/blink_data_increase.csv')
    analyzed = analyze_tablet_data(raw_data)
    report = generate_report(raw_data, analyzed)
    print("Generated Report:")
    print(report['report'])