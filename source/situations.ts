import {type SituationContext, SituationSpecification} from '@mozaik-ai/core';

export class WhenOthersSendAMessage extends SituationSpecification {
	isSatisfiedBy({event, participant}: SituationContext): boolean {
		return event.type === 'message.sent' && event.producerId !== participant.getId();
	}
}

export class WhenFunctionCallStarted extends SituationSpecification {
	isSatisfiedBy({event, participant}: SituationContext): boolean {
		return event.type === 'function_call.started' && event.producerId !== participant.getId();
	}
}

export class WhenFunctionCallCompleted extends SituationSpecification {
	isSatisfiedBy({event, participant}: SituationContext): boolean {
		return event.type === 'function_call.completed' && event.producerId !== participant.getId();
	}
}

export class WhenModelAnswers extends SituationSpecification {
	isSatisfiedBy({event, participant}: SituationContext): boolean {
		return event.type === 'model.answer' && event.producerId !== participant.getId();
	}
}

export class WhenInferenceStarted extends SituationSpecification {
	isSatisfiedBy({event}: SituationContext): boolean {
		return event.type === 'inference.started';
	}
}

export class WhenInferenceCompleted extends SituationSpecification {
	isSatisfiedBy({event}: SituationContext): boolean {
		return event.type === 'inference.completed';
	}
}

export class WhenInterceptionFires extends SituationSpecification {
	isSatisfiedBy({event}: SituationContext): boolean {
		return event.type === 'interception.started' || event.type === 'interception.finished';
	}
}

export class WhenParticipantJoined extends SituationSpecification {
	isSatisfiedBy({event}: SituationContext): boolean {
		return event.type === 'participant.joined';
	}
}

export class WhenParticipantLeft extends SituationSpecification {
	isSatisfiedBy({event}: SituationContext): boolean {
		return event.type === 'participant.left';
	}
}

export class WhenIJoined extends SituationSpecification {
	isSatisfiedBy({event, participant}: SituationContext): boolean {
		if (event.type !== 'participant.joined') {
			return false;
		}

		const payload = event.payload as {id?: string};
		return payload.id === participant.getId();
	}
}
