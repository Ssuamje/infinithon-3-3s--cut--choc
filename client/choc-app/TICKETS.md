## TO-DO (우선순위 desc)

- 유저의 깜빡임 정보를 판별하고 콤보를 나타낸다 ✅
- 유저의 깜빡임 정보를 기반으로 눈물생성 초(default 6s)동안 깜빡이지 않으면 모든 창의 위에 있는 overlay display로 indicate한다.
- 유저의 깜빡임 정보를 다음과 같이 로컬에 저장한다.
    - BlinkSession
        
        유저가 시작한 순간 생성된다. 유저가 종료하거나 창을 나가기 전까지 저장한다.
        
        ```json
        {
        	"id": string, // UUID
        	"events": [BlinkEvent],
        	"startedAt": Date, // "2025-08-09:17:15:20Z"
        	"endedAt": Date, // "2025-08-09:17:25:20Z"
        }
        ```
        
    - BlinkEvent
        
        유저가 깜빡일 때에, session에 저장되는 데이터
        
        ```json
        {
        	"blinkedAt": Date, // "2025-08-09:17:15:23Z"
        }
        ```
        
- 유저가 가진 session중 하나를 선택해서 LLM Gen된 리포트를 받아볼 수 있도록 한다.
    - ‘Report Generator Server’에 해당 session data를 전달.
    - return 받은 plain text를 우선 띄우는 것을 목적으로
        
        ```json
        {
        	"report": string
        }
        ```
        
    - 이후에 통계 UI가 디벨롭되면 그 때 변경하여 반영한다.
- 유저가 눈물벽 생성 시간을 선택할 수 있는 range option을 제공한다(min:4, max:10)
- onboarding에 유저가 눈물벽 생성 시간을 잴 수 있도록 한다.
- report에 눈물벽 생성시간을 추가 전달한다.