const API_BASE_URL = 'http://localhost:8080';

export interface UserData {
    user: string;
    income: number;
    savings: number;
    loan_balance: number;
    next_payment_date: string | null;
}

export async function fetchLoanDetails(userId: number): Promise<UserData> {
    const response = await fetch(`${API_BASE_URL}/loans/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch loan details');
    return response.json();
}

export async function getCreditScore(data: {
    mobile_money: number;
    utility_consistency: number;
    cash_flow: number;
    psych_score: number;
}): Promise<{ credit_score: number }> {
    const response = await fetch(`${API_BASE_URL}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to calculate score');
    return response.json();
}

export async function chatWithAssistant(userId: number, message: string): Promise<{ response: string }> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, message: message }),
    });
    if (!response.ok) throw new Error('Assistant error');
    return response.json();
}
