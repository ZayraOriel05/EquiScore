import requests
import json

class FinancialAssistant:
    def __init__(self, model_name="llama3"):
        self.ollama_url = "http://localhost:11434/api/generate"
        self.model_name = model_name

    def get_advice(self, user_data, user_query):
        # This is the "Context Engineering" part. We feed the user's financial state into the prompt.
        context = (
            f"You are the EquiScore AI Financial Coach. "
            f"User Profile: Income ${user_data['income']}, Savings ${user_data['savings']}, "
            f"Loan Balance ${user_data['balance']}. "
            f"The user is a micro-entrepreneur. Be encouraging, professional, and practical. "
            f"Answer this question: {user_query}"
        )
        
        payload = {
            "model": self.model_name,
            "prompt": context,
            "stream": False
        }
        
        try:
            response = requests.post(self.ollama_url, json=payload)
            response.raise_for_status()
            return response.json().get("response", "I'm sorry, I couldn't process that.")
        except Exception as e:
            return f"Error connecting to Ollama: {str(e)}. Make sure Ollama is running locally."

assistant = FinancialAssistant()
