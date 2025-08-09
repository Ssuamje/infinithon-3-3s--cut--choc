import pandas as pd
import numpy as np
from datetime import datetime

# 1 blink per 6 seconds
# bpm = 10

PERSONAS = []
# increase in blink rate
PERSONAS.append([8.0, 8.1, 8.5, 9.2, 9.0, 8.8, 7.7, 6.3, 7.0, 8.0, 8.1, 8.5, 9.3, 9.1, 10.5])
# decrease in blink rate
PERSONAS.append([10.0, 9.8, 9.5, 9.2, 8.8, 8.5, 7.7, 6.3, 6.0, 6.1, 6.5, 7.3, 7.1, 7.0, 6.5])
# stable blink rate
PERSONAS.append([10.0, 10.1, 10.5, 10.2, 10.0, 9.8, 9.7, 9.5, 9.6, 9.8, 10.0, 10.1, 10.2, 10.3, 10.4])
# 1 month blink rate
PERSONAS.append([9.8, 9.5, 9.2, 8.8])
# 1 week blink rate
PERSONAS.append([7.5])
# first blink rate
PERSONAS.append([])

PERSONA_NAMES = [
    "increase",
    "decrease",
    "stable",
    "month",
    "week",
    "firsrt"
]

TODAY = "2025-08-10"

def generate_blink_data(persona_index, blink_rate: float, day=TODAY, start_hour=0, end_hour=23):
    """
    Generate blink data of a day for a given persona index and time range.
    
    :param persona_index: Index of the persona in PERSONAS.
    :param blink_rate: Blink rate for the persona.
    :param day: Date for the blink data in "YYYY-MM-DD" format (default is TODAY).
    :param start_hour: Start hour for the data generation (default is 0).
    :param end_hour: End hour for the data generation (default is 23), not inclusive.
    :return: A string representing the generated blink data.
    """
    if persona_index < 0 or persona_index >= len(PERSONAS):
        raise ValueError("Invalid persona index")

    total_blinks = int(60 * (end_hour - start_hour) * blink_rate)  # Calculate the total number of data points for a day

    data = []
    start_timestamp = f"{day}T{start_hour:02d}:00:00"
    start_timestamp = datetime.strptime(start_timestamp, "%Y-%m-%dT%H:%M:%S")
    for blink_id in range(total_blinks):
        blink_interval = 60 / blink_rate + np.random.uniform(-0.5, 0.5) # Randomize the blink interval slightly
        timestamp = start_timestamp + pd.Timedelta(seconds=blink_id * blink_interval)
        data.append(f"{timestamp.isoformat()}")
        if timestamp.hour >= end_hour:
            break  # Stop if we reach the end hour
    return data

def generate_blink_data_for_all_personas():
    """
    Generate blink data for all personas for a specific day and time range.

    :return: A dictionary with persona names as keys and their corresponding blink data as values.
    """
    all_persona_data = {}
    for index, (persona, name) in enumerate(zip(PERSONAS, PERSONA_NAMES)):
        cur_date = datetime.strptime(TODAY, "%Y-%m-%d")
        for week, blink_rate in enumerate(persona[::-1]):
            for _ in range(7):  # Generate data for 7 days
                if cur_date.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
                    cur_date -= pd.Timedelta(days=1)
                    continue
                cur_date -= pd.Timedelta(days=1)
                data = generate_blink_data(index, blink_rate, cur_date.strftime("%Y-%m-%d"), start_hour=9, end_hour=17)
                all_persona_data[name] = all_persona_data.get(name, []) + data
    return all_persona_data

if __name__ == "__main__":

    # Example usage
    persona_index = 0  # Change this to test different personas
    day = TODAY
    start_hour = 9
    end_hour = 17

    blink_data = generate_blink_data_for_all_personas()

    for persona, data in blink_data.items():
        with open(f"blink_data_{persona}.csv", "w") as f:
            f.write("ID,TIMESTAMP\n")
            for idx, line in enumerate(data):
                timestamp = line.strip()
                f.write(f"{idx},{timestamp}\n")
