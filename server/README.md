폰트 지원을 위해 이거 까셈
```
sudo apt-get install fonts-nanum* # 폰트 설치
sudo apt install fonts-noto-color-emoji
sudo fc-cache -fv # 캐시 제거
sudo fc-list | grep nanum # 폰트 설치 확인
rm -rf ~/.cache/matplotlib/* # matplotlib 캐시 제거
```

이케 실행!
```
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```