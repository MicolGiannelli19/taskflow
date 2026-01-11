from fastapi import APIRouter, HTTPException
from .models import Ticket, TicketFormData
from typing import List
import uuid

router = APIRouter()

# Temporary in-memory storage
tickets: List[Ticket] = []

@router.get("/tickets", response_model=List[Ticket])
def get_tickets():
    return tickets

@router.post("/tickets", response_model=Ticket)
def create_ticket(ticket_data: TicketFormData):
    ticket = Ticket(
        id=str(uuid.uuid4()),
        columnID="234567",  # default column
        **ticket_data.dict()
    )
    tickets.append(ticket)
    return ticket
