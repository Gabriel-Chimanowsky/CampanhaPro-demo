<?php

namespace App\Services\AI\Support;

use RuntimeException;
use Throwable;

class AiProviderException extends RuntimeException
{
    public function __construct(
        protected string $userMessage,
        protected ?string $technicalMessage = null,
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        parent::__construct($userMessage, $code, $previous);
    }

    public function userMessage(): string
    {
        return $this->userMessage;
    }

    public function technicalMessage(): ?string
    {
        return $this->technicalMessage;
    }
}
